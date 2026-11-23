import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

/* Default: current week (Mon–Sun) */
function getWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);

    const start = new Date(now.setDate(diff));
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "Please select a branch" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        /* Date range */
        let start: Date;
        let end: Date;

        if (fromParam || toParam) {
            start = fromParam ? new Date(fromParam) : new Date("2026-01-01");
            end = toParam ? new Date(toParam) : new Date();
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
        } else {
            ({ start, end } = getWeekRange());
        }

        /* Aggregate dues */
        const dues = await Loan.aggregate([
            {
                $match: {
                    branch: ctx.branchObjectId,
                    status: { $ne: "APPROVED" },
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $project: {
                    customerId: "$customer.customerCode",
                    name: "$customer.name",
                    phone: "$customer.phone",
                    principal: { $ifNull: ["$weeklyPrincipal", 0] },
                    interest: { $ifNull: ["$weeklyInterest", 0] },
                    savings: { $ifNull: ["$weeklySavings", 0] },
                    total: {
                        $add: [
                            { $ifNull: ["$weeklyPrincipal", 0] },
                            { $ifNull: ["$weeklyInterest", 0] },
                            { $ifNull: ["$weeklySavings", 0] },
                        ],
                    },
                },
            },
            { $sort: { name: 1 } },
        ]);

        /* Totals */
        const totals = dues.reduce(
            (a, c) => {
                a.principal += c.principal;
                a.interest += c.interest;
                a.savings += c.savings;
                a.total += c.total;
                return a;
            },
            { principal: 0, interest: 0, savings: 0, total: 0 }
        );

        return NextResponse.json({
            success: true,
            from: start.toISOString().slice(0, 10),
            to: end.toISOString().slice(0, 10),
            dues,
            totals,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
