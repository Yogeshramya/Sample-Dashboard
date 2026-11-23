import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import CreditModel from "@/models/Credit";
import Loan from "@/models/Loan";
import { Credit } from "@/types/credit";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface CreditQuery {
    date?: { $gte: Date; $lt: Date };
    branch?: mongoose.Types.ObjectId;
    status?: "APPROVED";
    module?: { $ne: string };
}

export async function GET(request: NextRequest) {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM

    try {
        const ctx = await getBranchContext(request);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        /* ---------------- DATE RANGE ---------------- */
        let start: Date | undefined;
        let end: Date | undefined;

        if (month) {
            start = new Date(`${month}-01`);
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
        }

        /* ---------------- CREDIT QUERY ---------------- */
        const creditQuery: CreditQuery = {
            status: "APPROVED",
            module: { $ne: "PERSONAL" },
        };

        if (ctx.branchObjectId) {
            creditQuery.branch = ctx.branchObjectId;
        }

        if (start && end) {
            creditQuery.date = { $gte: start, $lt: end };
        }

        const credits = await CreditModel.find(creditQuery).sort({ date: -1 });

        const creditTotal = credits.reduce(
            (sum: number, c: Credit) => sum + (c.amount || 0),
            0
        );

        /* ---------------- DUES PAID AGGREGATION ---------------- */
        const duesPaidAgg = await Loan.aggregate([
            {
                $match: {
                    ...(ctx.branchObjectId && {
                        branch: ctx.branchObjectId,
                    }),
                    ...(start && end && {
                        loanDate: { $gte: start, $lt: end },
                    }),
                    status: { $in: ["APPROVED", "REPAID"] },
                },
            },
            { $unwind: "$dues" },
            {
                $match: {
                    "dues.paid": true,
                },
            },
            {
                $group: {
                    _id: null,
                    totalDuesPaid: { $sum: "$dues.total" },
                    totalPrincipalPaid: { $sum: "$dues.principal" },
                    totalInterestPaid: { $sum: "$dues.interest" },
                    totalDocChargePaid: { $sum: "$dues.docCharge" },
                    totalSavingsPaid: { $sum: "$dues.savings" },
                },
            },
        ]);

        const duesPaid = duesPaidAgg[0]?.totalDuesPaid || 0;
        const principalPaid = duesPaidAgg[0]?.totalPrincipalPaid || 0;
        const interestPaid = duesPaidAgg[0]?.totalInterestPaid || 0;
        const docChargePaid = duesPaidAgg[0]?.totalDocChargePaid || 0;
        const savingsPaid = duesPaidAgg[0]?.totalSavingsPaid || 0;

        return NextResponse.json({
            success: true,
            totalIncome: creditTotal + duesPaid,
            creditTotal,
            duesPaid,
            principalPaid,
            interestPaid,
            docChargePaid,
            savingsPaid,
            credits,
        });
    } catch (error) {
        console.error("Credit Income API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
