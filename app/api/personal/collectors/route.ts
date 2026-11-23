import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalDeposit from "@/models/PersonalDeposit";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const targetBranch = ctx.isAdmin
            ? (new URL(req.url).searchParams.get("branchId") || ctx.branchId)
            : ctx.branchId;

        const userQuery: Record<string, unknown> = {};
        if (targetBranch && mongoose.Types.ObjectId.isValid(targetBranch)) {
            userQuery.branch = new mongoose.Types.ObjectId(targetBranch);
        }

        const users = await User.find(userQuery)
            .select("name email role phone employeeId designation department branch")
            .populate("branch", "name branchName code")
            .lean();

        // For each user, compute active accounts assigned and total deposits collected
        const collectorsWithStats = await Promise.all(
            users.map(async (u) => {
                const [accountsCount, totalCollectedAgg] = await Promise.all([
                    PersonalAccount.countDocuments({
                        collectorId: u._id,
                        status: "ACTIVE",
                    }),
                    PersonalDeposit.aggregate([
                        { $match: { collectedBy: u._id, status: { $in: ["APPROVED", null] } } },
                        { $group: { _id: null, total: { $sum: "$amount" } } },
                    ]),
                ]);

                return {
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    phone: u.phone || "-",
                    employeeId: u.employeeId || "-",
                    designation: u.designation || "Collector",
                    department: u.department || "Operations",
                    branch: u.branch,
                    role: u.role,
                    assignedAccounts: accountsCount,
                    totalCollected: totalCollectedAgg[0]?.total || 0,
                };
            })
        );

        return NextResponse.json({
            success: true,
            collectors: collectorsWithStats,
        });
    } catch (error) {
        console.error("Personal collectors GET error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
