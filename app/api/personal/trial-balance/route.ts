import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import Credit from "@/models/Credit";
import Debit from "@/models/Debit";
import Remittance from "@/models/Remittance";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json({ success: false, error: "Please select a branch to view trial balance" }, { status: 400 });
        }

        const branchId = ctx.branchObjectId;

        const { searchParams } = new URL(req.url);
        let from = searchParams.get("from");
        let to = searchParams.get("to");

        if (ctx.isTeller) {
            const todayStr = getTodayIST();
            from = todayStr;
            to = todayStr;
        }

        if (!from || !to) {
            const todayStr = getTodayIST();
            from = todayStr;
            to = todayStr;
        }

        const startDate = parseISTDate(from, false);
        const endDate = parseISTDate(to, true);

        /* ---------------- 1. INFLOWS / CREDITS ---------------- */

        // A. Personal Deposits collected
        const depositAgg = await PersonalDeposit.aggregate([
            {
                $match: {
                    branchId: branchId,
                    status: { $in: ["APPROVED", null] },
                    depositDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const cashDeposits = depositAgg.find((d) => d._id === "CASH")?.total || 0;
        const bankDeposits = depositAgg.find((d) => d._id !== "CASH")?.total || 0;
        const totalDeposits = cashDeposits + bankDeposits;

        // B. Personal Credits (Other Incomes)
        const creditAgg = await Credit.aggregate([
            {
                $match: {
                    branch: branchId,
                    module: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$title",
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const totalCredits = creditAgg.reduce((sum, c) => sum + c.total, 0);

        // C. Inward Remittances (Into Smart Savings)
        const inRemittanceAgg = await Remittance.aggregate([
            {
                $match: {
                    toBranch: branchId,
                    toModule: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$remittanceType",
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const totalInRemittance = inRemittanceAgg.reduce((sum, r) => sum + r.total, 0);

        /* ---------------- 2. OUTFLOWS / DEBITS ---------------- */

        // A. Personal Debits (Operating Expenses)
        const debitAgg = await Debit.aggregate([
            {
                $match: {
                    branch: branchId,
                    module: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$title",
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const totalDebits = debitAgg.reduce((sum, d) => sum + d.total, 0);

        // B. Personal Account Settlements / Maturity Payouts
        const settlementAgg = await PersonalAccount.aggregate([
            {
                $match: {
                    branchId: branchId,
                    status: { $in: ["SETTLED", "CLOSED"] },
                    updatedAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$maturityAmount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const totalSettlements = settlementAgg.reduce((sum, s) => sum + s.total, 0);

        // C. Outward Remittances (Out of Smart Savings)
        const outRemittanceAgg = await Remittance.aggregate([
            {
                $match: {
                    fromBranch: branchId,
                    fromModule: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: "$remittanceType",
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const totalOutRemittance = outRemittanceAgg.reduce((sum, r) => sum + r.total, 0);

        /* ---------------- COMPILE STATEMENT ---------------- */

        const incomeItems = [
            {
                title: "Savings Deposit Collections (Cash)",
                amount: cashDeposits,
                type: "Deposit",
            },
            ...(bankDeposits > 0
                ? [
                      {
                          title: "Savings Deposit Collections (Bank/UPI)",
                          amount: bankDeposits,
                          type: "Deposit",
                      },
                  ]
                : []),
            ...creditAgg.map((c) => ({
                title: c._id || "Other Income",
                amount: c.total,
                type: "Income",
            })),
            ...(totalInRemittance > 0
                ? [
                      {
                          title: "Inward Remittance (Inter-Module / Inter-Branch)",
                          amount: totalInRemittance,
                          type: "Remittance",
                      },
                  ]
                : []),
        ];

        const expenseItems = [
            ...debitAgg.map((d) => ({
                title: d._id || "Operating Expense",
                amount: d.total,
                type: "Expense",
            })),
            ...(totalSettlements > 0
                ? [
                      {
                          title: "Maturity Releases & Premature Settlements",
                          amount: totalSettlements,
                          type: "Settlement",
                      },
                  ]
                : []),
            ...(totalOutRemittance > 0
                ? [
                      {
                          title: "Outward Remittance (Inter-Module / Inter-Branch)",
                          amount: totalOutRemittance,
                          type: "Remittance",
                      },
                  ]
                : []),
        ];

        const grandTotalIncome = totalDeposits + totalCredits + totalInRemittance;
        const grandTotalExpense = totalDebits + totalSettlements + totalOutRemittance;
        const netDifference = grandTotalIncome - grandTotalExpense;

        return NextResponse.json({
            success: true,
            from,
            to,
            summary: {
                totalIncome: grandTotalIncome,
                totalExpense: grandTotalExpense,
                netDifference,
                deposits: totalDeposits,
                credits: totalCredits,
                debits: totalDebits,
                settlements: totalSettlements,
                inRemittance: totalInRemittance,
                outRemittance: totalOutRemittance,
            },
            incomes: incomeItems,
            expenses: expenseItems,
        });
    } catch (error) {
        console.error("Personal Trial Balance error:", error);
        return NextResponse.json({ success: false, error: "Failed to compute savings trial balance" }, { status: 500 });
    }
}

