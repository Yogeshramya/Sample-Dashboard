import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";
import Credit from "@/models/Credit";
import Debit from "@/models/Debit";
import Remittance from "@/models/Remittance";
import CashBox from "@/models/CashBox";
import DaySheetDraft from "@/models/DaySheetDraft";
import User from "@/models/User";
import Branch from "@/models/Branch";
import mongoose from "mongoose";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface Denoms {
    note: number;
    count: number;
    total: number;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "Please select a branch to view day sheet" },
                { status: 400 }
            );
        }

        const branchObjectId = ctx.branchObjectId;

        const { searchParams } = new URL(req.url);
        let from = searchParams.get("from");
        let to = searchParams.get("to");
        const singleDate = searchParams.get("date");
        const reportType = searchParams.get("type");

        if (singleDate && (!from || !to)) {
            from = singleDate;
            to = singleDate;
        }

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

        /* =======================
           1. Check CashBox Today (Smart Savings)
        ======================= */
        const dayDate = new Date(from);
        dayDate.setUTCHours(0, 0, 0, 0);

        const cashBoxToday = await CashBox.findOne({
            branch: branchObjectId,
            module: "PERSONAL",
            $or: [
                { date: { $gte: startDate, $lte: endDate } },
                { date: dayDate },
            ],
        })
            .populate("employee", "name")
            .populate("approvedBy", "name")
            .sort({ updatedAt: -1, date: -1 })
            .lean();

        const cashBoxStatus = cashBoxToday?.status || "OPEN";

        // Find the most recent CashBox prior to startDate.
        // If a prior day sheet exists and has NOT been approved yet,
        // then next day opening balance must NOT show, as per admin approval rules.
        const priorCashBox = await CashBox.findOne({
            branch: branchObjectId,
            module: "PERSONAL",
            date: { $lt: startDate },
        })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const isPriorDaySheetPending = priorCashBox ? priorCashBox.status !== "APPROVED" : false;
        const priorDaySheetDate = priorCashBox?.date || null;
        const priorDaySheetStatus = priorCashBox?.status || null;

        // Check draft denomination if not closed or when requested
        let draftInfo = null;
        if (!cashBoxToday || reportType === "TRUE") {
            draftInfo = await DaySheetDraft.findOne({
                branch: branchObjectId,
                module: "PERSONAL",
                date: from,
            })
                .populate("employee", "name")
                .sort({ updatedAt: -1 })
                .lean();
        }

        /* =======================
           2. Savings Deposits (Income / Credits)
        ======================= */
        const depositsAgg = await PersonalDeposit.aggregate([
            {
                $match: {
                    branchId: branchObjectId,
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

        const totalDeposits = depositsAgg.reduce((s, d) => s + (d.total || 0), 0);

        /* =======================
           3. Personal Miscellaneous Credits (Income)
        ======================= */
        const creditAgg = await Credit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
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

        const creditTotal = creditAgg.reduce((s, c) => s + (c.total || 0), 0);

        /* =======================
           4. Approved Inward Remittances (Income)
        ======================= */
        const inwardRemitAgg = await Remittance.aggregate([
            {
                $match: {
                    toBranch: branchObjectId,
                    toModule: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const inwardRemitTotal = inwardRemitAgg[0]?.total || 0;

        /* =======================
           4B. Personal Loan Collections (Income / Credits)
        ======================= */
        const loanCollAgg = await PersonalLoanCollection.aggregate([
            {
                $match: {
                    branchId: branchObjectId,
                    status: "APPROVED",
                    transactionDate: { $gte: startDate, $lte: endDate },
                    paymentMethod: "CASH",
                },
            },
            {
                $group: {
                    _id: "$collectionType",
                    total: { $sum: "$totalAmount" },
                    principal: { $sum: "$principalPortion" },
                    interest: { $sum: "$interestPortion" },
                    penalty: { $sum: "$penaltyPortion" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const loanCollectionTotal = loanCollAgg.reduce((s, c) => s + (c.total || 0), 0);

        /* =======================
           5. Operating Expenses / Debits (Expenses)
        ======================= */
        const debitAgg = await Debit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
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

        const debitTotal = debitAgg.reduce((s, d) => s + (d.total || 0), 0);

        /* =======================
           6. Maturity & Preclose Settlements (Expenses / Payouts)
        ======================= */
        const settlementAgg = await PersonalAccount.aggregate([
            {
                $match: {
                    branchId: branchObjectId,
                    status: { $in: ["SETTLED", "CLOSED"] },
                    updatedAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$maturityAmount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const settlementTotal = settlementAgg[0]?.total || 0;

        /* =======================
           7. Approved Outward Remittances (Expenses)
        ======================= */
        const outwardRemitAgg = await Remittance.aggregate([
            {
                $match: {
                    fromBranch: branchObjectId,
                    fromModule: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const outwardRemitTotal = outwardRemitAgg[0]?.total || 0;

        /* =======================
           7B. Personal Loan Cash Disbursements (Expenses / Debits)
        ======================= */
        const loanDisbAgg = await PersonalLoan.aggregate([
            {
                $match: {
                    branchId: branchObjectId,
                    status: { $in: ["DISBURSED", "ACTIVE", "CLOSED", "PRECLOSED", "OVERDUE"] },
                    disbursedAt: { $gte: startDate, $lte: endDate },
                    disbursementMethod: "CASH",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$netDisbursedAmount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const loanDisbursementTotal = loanDisbAgg[0]?.total || 0;

        /* =======================
           8. Totals & Income/Expense Summary
        ======================= */
        const totalIncome = totalDeposits + creditTotal + inwardRemitTotal + loanCollectionTotal;
        const totalExpense = debitTotal + settlementTotal + outwardRemitTotal + loanDisbursementTotal;

        /* =======================
           9. Denomination Breakdown
        ======================= */
        let denominationAgg: Denoms[] = [];

        // Check approved cashbox first
        denominationAgg = await CashBox.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    module: "PERSONAL",
                    status: "APPROVED",
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: "$denomination" },
            {
                $group: {
                    _id: "$denomination.note",
                    count: { $sum: "$denomination.count" },
                    total: { $sum: "$denomination.total" },
                },
            },
            {
                $project: {
                    _id: 0,
                    note: "$_id",
                    count: 1,
                    total: 1,
                },
            },
            { $sort: { note: -1 } },
        ]);

        // If no approved cashbox, use today's cashbox, draft, or untouched leave-day carryover
        if (denominationAgg.length === 0) {
            if (cashBoxToday?.denomination?.length) {
                denominationAgg = cashBoxToday.denomination.map((d: Denoms) => ({
                    note: d.note,
                    count: d.count,
                    total: d.total || d.note * d.count,
                }));
            } else if (draftInfo?.denomination?.length) {
                denominationAgg = draftInfo.denomination.map((d: Denoms) => ({
                    note: d.note,
                    count: d.count,
                    total: d.total || d.note * d.count,
                }));
            } else if (
                !cashBoxToday &&
                !isPriorDaySheetPending &&
                totalIncome === 0 &&
                totalExpense === 0 &&
                priorCashBox?.status === "APPROVED" &&
                priorCashBox?.denomination?.length
            ) {
                // On leave days (Sundays / continuous holidays) where previous day sheet was APPROVED
                // and zero transactions occurred today, vault cash remains untouched.
                denominationAgg = priorCashBox.denomination.map((d: Denoms) => ({
                    note: d.note,
                    count: d.count,
                    total: d.total || d.note * d.count,
                }));
            }
        }

        /* =======================
           10. Opening & Closing Balances (Admin Approval Enforcement)
        ======================= */
        let openingBalance = 0;
        let closingBalance = 0;

        if (isPriorDaySheetPending) {
            // Previous day sheet has not been approved by admin.
            // Under strict policy: next day opening balance must NOT show until previous day sheet is approved.
            openingBalance = 0;
            closingBalance = 0;
        } else {
            const prevClosingBalance = (priorCashBox && priorCashBox.status === "APPROVED")
                ? (priorCashBox.closingBalance || 0)
                : 0;

            if (cashBoxToday && cashBoxToday.status === "APPROVED") {
                openingBalance = cashBoxToday.openingBalance || 0;
                closingBalance = cashBoxToday.closingBalance || 0;
            } else if (cashBoxToday && cashBoxToday.status === "PENDING") {
                openingBalance = cashBoxToday.openingBalance || prevClosingBalance;
                closingBalance = cashBoxToday.closingBalance || (openingBalance + totalIncome - totalExpense);
            } else {
                openingBalance = prevClosingBalance;
                closingBalance = openingBalance + totalIncome - totalExpense;
            }
        }

        /* =======================
           10. Audit Signoffs
        ======================= */
        const closedBy =
            cashBoxToday?.employee?.name ||
            (typeof cashBoxToday?.employee === "string" ? cashBoxToday.employee : null) ||
            draftInfo?.employee?.name ||
            null;

        const closedAt =
            cashBoxToday?.updatedAt ||
            cashBoxToday?.date ||
            draftInfo?.updatedAt ||
            null;

        const approvedBy =
            cashBoxToday?.approvedBy?.name ||
            (typeof cashBoxToday?.approvedBy === "string" ? cashBoxToday.approvedBy : null) ||
            null;

        const approvedAt = cashBoxToday?.approvedAt || null;

        // Structured income list
        const incomeList: Array<{ _id: string; total: number }> = [
            { _id: "Savings Deposit Collections", total: totalDeposits },
            ...creditAgg,
        ];
        if (inwardRemitTotal > 0) {
            incomeList.push({ _id: "Inward Vault Remittance", total: inwardRemitTotal });
        }
        for (const lc of loanCollAgg) {
            const label =
                lc._id === "DAILY"
                    ? "Personal Loan Daily Collections"
                    : lc._id === "PRECLOSURE_SETTLEMENT"
                        ? "Personal Loan Pre-closure Collections"
                        : "Personal Loan EMI Collections";
            incomeList.push({ _id: label, total: lc.total });
        }

        // Structured expense list
        const expenseList: Array<{ _id: string; total: number }> = [
            ...debitAgg,
        ];
        if (settlementTotal > 0) {
            expenseList.push({ _id: "Savings Maturity Settlements", total: settlementTotal });
        }
        if (outwardRemitTotal > 0) {
            expenseList.push({ _id: "Outward Vault Remittance", total: outwardRemitTotal });
        }
        if (loanDisbursementTotal > 0) {
            expenseList.push({ _id: "Personal Loan Cash Disbursements", total: loanDisbursementTotal });
        }

        return NextResponse.json({
            success: true,
            report: {
                from,
                to,
                openingBalance,
                closingBalance,
                totalIncome,
                totalExpense,
                cashBoxStatus,
                cashBox: cashBoxToday,
                closedBy,
                closedAt,
                approvedBy,
                approvedAt,
                income: incomeList,
                expenses: expenseList,
                denomination: denominationAgg,
                // Approval validation metadata
                previousDaySheetPending: isPriorDaySheetPending,
                previousDaySheetDate: priorDaySheetDate,
                previousDaySheetStatus: priorDaySheetStatus,
            },
        });
    } catch (error) {
        console.error("Personal DaySheet Report Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate personal day sheet report" },
            { status: 500 }
        );
    }
}
