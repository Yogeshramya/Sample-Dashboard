import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const now = new Date();

        const baseMatch: Record<string, unknown> = {
            employee: { $ne: null },
            status: { $in: ["APPROVED", "ARREAR", "REPAID", "CLOSED"] },
        };

        if (ctx.branchObjectId) {
            baseMatch.branch = ctx.branchObjectId;
        }

        const runLeaderboardAgg = async (dateFilter?: { $gte: Date; $lt: Date }) => {
            const pipeline: mongoose.PipelineStage[] = [
                {
                    $project: {
                        employee: 1,
                        branch: 1,
                        status: 1,
                        loanAmount: { $ifNull: ["$loanAmount", 0] },
                        collections: 1,
                        effectiveDate: {
                            $toDate: { $ifNull: ["$loanDate", { $ifNull: ["$approvedAt", "$createdAt"] }] },
                        },
                    },
                },
                {
                    $match: {
                        ...baseMatch,
                        ...(dateFilter ? { effectiveDate: dateFilter } : {}),
                    },
                },
                {
                    $group: {
                        _id: "$employee",
                        totalLoanAmount: {
                            $sum: "$loanAmount",
                        },
                        borrowers: {
                            $sum: 1,
                        },
                        totalCollections: {
                            $sum: {
                                $sum: "$collections.amount",
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        let: { empId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            { $eq: ["$_id", "$$empId"] },
                                            { $eq: [{ $toString: "$_id" }, { $toString: "$$empId" }] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "employeeUser",
                    },
                },
                {
                    $unwind: {
                        path: "$employeeUser",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        employeeId: { $ifNull: ["$employeeUser._id", "$_id"] },
                        employee: { $ifNull: ["$employeeUser.name", "Staff"] },
                        role: { $ifNull: ["$employeeUser.role", "STAFF"] },
                        loanAmount: "$totalLoanAmount",
                        borrowers: 1,
                        totalCollections: 1,
                    },
                },
                {
                    $sort: {
                        loanAmount: -1,
                    },
                },
                {
                    $limit: 10,
                },
            ];

            return await Loan.aggregate(pipeline);
        };

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

        const currentMonthName = now.toLocaleString("en-IN", {
            month: "long",
        });

        // 1. Try current month
        let leaderboard = await runLeaderboardAgg({
            $gte: startOfMonth,
            $lt: endOfMonth,
        });
        let activeMonth = currentMonthName;

        // 2. Fall back to previous month if current month is empty
        if (!leaderboard.length) {
            const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthName = prevMonthDate.toLocaleString("en-IN", { month: "long" });

            const prevLeaderboard = await runLeaderboardAgg({
                $gte: startOfPrevMonth,
                $lt: startOfMonth,
            });

            if (prevLeaderboard.length) {
                leaderboard = prevLeaderboard;
                activeMonth = prevMonthName;
            }
        }

        // 3. Fall back to all-time active/disbursed loans if still empty
        if (!leaderboard.length) {
            const allTimeLeaderboard = await runLeaderboardAgg();
            if (allTimeLeaderboard.length) {
                leaderboard = allTimeLeaderboard;
                activeMonth = "All Time";
            }
        }

        // 4. Fallback to registered users if no loan records exist
        if (!leaderboard.length) {
            const userFilter: Record<string, unknown> = {
                role: { $in: ["EMPLOYEE_MFI", "MANAGER", "TELLER", "AREA_MANAGER"] },
            };
            if (ctx.branchObjectId) {
                userFilter.branch = ctx.branchObjectId;
            }
            const users = await User.find(userFilter).limit(5).select("name role");
            leaderboard = users.map((u) => ({
                employeeId: u._id,
                employee: u.name,
                role: u.role,
                loanAmount: 0,
                borrowers: 0,
                totalCollections: 0,
            }));
            activeMonth = currentMonthName;
        }

        return NextResponse.json({
            success: true,
            month: activeMonth,
            data: leaderboard,
        });
    } catch (err) {
        console.error("Leaderboard fetch error:", err);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch leaderboard",
        }, { status: 500 });
    }
}
