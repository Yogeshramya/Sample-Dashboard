import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Branch from "@/models/Branch";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface BranchLoanRaw {
    _id: mongoose.Types.ObjectId;
    totalLoanAmount: number;
}

interface BranchLoanPopulated {
    _id: {
        _id: mongoose.Types.ObjectId;
        name: string;
    };
    totalLoanAmount: number;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const now = new Date();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

        const baseMatch: Record<string, unknown> = {
            status: { $in: ["APPROVED", "ARREAR", "REPAID", "CLOSED"] },
            branch: { $ne: null },
        };

        if (ctx.branchObjectId) {
            baseMatch.branch = ctx.branchObjectId;
        }

        const runTopBranchesAgg = async (dateFilter?: { $gte: Date; $lt: Date }) => {
            const pipeline: mongoose.PipelineStage[] = [
                {
                    $project: {
                        branch: 1,
                        loanAmount: { $ifNull: ["$loanAmount", 0] },
                        status: 1,
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
                        _id: "$branch",
                        totalLoanAmount: { $sum: "$loanAmount" },
                    },
                },
                {
                    $sort: { totalLoanAmount: -1 },
                },
                {
                    $limit: ctx.isAdmin && !ctx.branchObjectId ? 3 : 1,
                },
            ];

            return (await Loan.aggregate(pipeline)) as BranchLoanRaw[];
        };

        // Try current month first
        let branchLoans = await runTopBranchesAgg({
            $gte: startOfMonth,
            $lt: startOfNextMonth,
        });

        // Fall back to all-time active/disbursed if current month has no data
        if (!branchLoans.length) {
            branchLoans = await runTopBranchesAgg();
        }

        if (branchLoans.length > 0) {
            await Branch.populate(branchLoans, {
                path: "_id",
                select: "name",
            });

            const populated = branchLoans as unknown as BranchLoanPopulated[];

            const topBranches = populated.map((b) => ({
                name: b._id?.name ?? "Unknown Branch",
                amount: b.totalLoanAmount || 0,
            }));

            return NextResponse.json({
                success: true,
                data: topBranches,
            });
        }

        // Fallback: list branches directly if no loans exist at all yet
        const branchFilter: Record<string, unknown> = {};
        if (ctx.branchObjectId) {
            branchFilter._id = ctx.branchObjectId;
        }

        const fallbackBranches = await Branch.find(branchFilter)
            .limit(ctx.isAdmin && !ctx.branchObjectId ? 3 : 1)
            .select("name");

        return NextResponse.json({
            success: true,
            data: fallbackBranches.map((b) => ({
                name: b.name,
                amount: 0,
            })),
        });
    } catch (error) {
        console.error("Top branches loan amount fetch error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch top branches" },
            { status: 500 }
        );
    }
}
