import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const now = new Date();

        const months: { key: string; label: string; amount: number }[] = [];

        // LAST 12 MONTHS
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

            months.push({
                key,
                label: d.toLocaleString("en-IN", {
                    month: "short",
                    year: "numeric",
                }),
                amount: 0,
            });
        }

        const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const matchStage: Record<string, unknown> = {
            status: { $in: ["APPROVED", "ARREAR", "REPAID", "CLOSED"] },
        };

        if (ctx.branchObjectId) {
            matchStage.branch = ctx.branchObjectId;
        }

        const data = await Loan.aggregate([
            {
                $match: matchStage,
            },
            {
                $project: {
                    loanAmount: { $ifNull: ["$loanAmount", 0] },
                    effectiveDate: {
                        $toDate: { $ifNull: ["$loanDate", { $ifNull: ["$approvedAt", "$createdAt"] }] }
                    }
                }
            },
            {
                $match: {
                    effectiveDate: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$effectiveDate" },
                        month: { $month: "$effectiveDate" },
                    },
                    total: { $sum: "$loanAmount" },
                },
            },
        ]);

        for (const item of data) {
            const key = `${item._id.year}-${item._id.month}`;
            const m = months.find((x) => x.key === key);
            if (m) m.amount = item.total;
        }

        return NextResponse.json({
            success: true,
            data: months.map((m) => ({
                month: m.label,
                amount: m.amount,
                disbursed: m.amount,
            })),
        });
    } catch (error) {
        console.error("Last 6 months API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
