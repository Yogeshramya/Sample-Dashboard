import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import Credit from "@/models/Credit";
import Debit from "@/models/Debit";
import CashBox from "@/models/CashBox";
import DaySheetDraft from "@/models/DaySheetDraft";
import User from "@/models/User";
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
        void User; // Ensure User model is registered for population

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
        const today = searchParams.get("today");
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
        } else if (today === "true") {
            const todayStr = getTodayIST();
            from = todayStr;
            to = todayStr;
        }

        if (!from || !to) {
            return NextResponse.json(
                { success: false, error: "From & To dates required" },
                { status: 400 }
            );
        }

        const startDate = parseISTDate(from, false);
        const endDate = parseISTDate(to, true);
        /* =======================
           Check CashBox Today
        ======================= */
        const dayDate = new Date(from);
        dayDate.setUTCHours(0, 0, 0, 0);

        const cashBoxToday = await CashBox.findOne({
            branch: branchObjectId,
            module: { $ne: "PERSONAL" },
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
            module: { $ne: "PERSONAL" },
            date: { $lt: startDate },
        })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const isPriorDaySheetPending = priorCashBox ? priorCashBox.status !== "APPROVED" : false;
        const priorDaySheetDate = priorCashBox?.date || null;
        const priorDaySheetStatus = priorCashBox?.status || null;

        // Check draft if not closed or when explicitly requesting draft info
        let draftInfo = null;
        if (!cashBoxToday || reportType === "TRUE") {
            draftInfo = await DaySheetDraft.findOne({
                branch: branchObjectId,
                module: { $ne: "PERSONAL" },
                date: from,
            })
                .populate("employee", "name")
                .sort({ updatedAt: -1 })
                .lean();
        }

        /* =======================
            Bill Collection (Income)
        ======================= */
        const billAgg = await Bill.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    status: "APPROVED",
                    collectedAt: { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: "$loans" },
            {
                $group: {
                    _id: null,
                    principal: { $sum: "$loans.principal" },
                    interest: { $sum: "$loans.interest" },
                    savings: { $sum: "$loans.savings" },
                },
            },
        ]);

        const principal = billAgg[0]?.principal ?? 0;
        const interest = billAgg[0]?.interest ?? 0;
        const savings = billAgg[0]?.savings ?? 0;

        /* =======================
           Credit (Income)
        ======================= */
        const creditAgg = await Credit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    module: { $ne: "PERSONAL" },
                    mode: "Cash",
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

        const creditTotal = creditAgg.reduce((s, c) => s + c.total, 0);

        /* =======================
           Debit (Expense)
        ======================= */
        const debitAgg = await Debit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    module: { $ne: "PERSONAL" },
                    mode: "Cash",
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

        const debitTotal = debitAgg.reduce((s, d) => s + d.total, 0);

        /* =======================
           Totals & Balances (Admin Approval Enforcement)
        ======================= */
        const totalIncome = principal + interest + savings + creditTotal;
        const totalExpense = debitTotal;

        /* =======================
            Denomination
        ======================= */
        let denominationAgg: Denoms[] = [];

        // Check approved cashbox first
        denominationAgg = await CashBox.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    module: { $ne: "PERSONAL" },
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

        // If no approved cashbox, use current cashBox denominations or draft
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
           Balances & Admin Approval Enforcement
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
           Audit Timestamps & Actor
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
                income: [
                    { _id: "Loan Principal", total: principal },
                    { _id: "Loan Interest", total: interest },
                    { _id: "Savings", total: savings },
                    ...creditAgg,
                ],
                expenses: debitAgg,
                denomination: denominationAgg,
                // Approval validation metadata
                previousDaySheetPending: isPriorDaySheetPending,
                previousDaySheetDate: priorDaySheetDate,
                previousDaySheetStatus: priorDaySheetStatus,
            },
        });
    } catch (error) {
        console.error("Summary Report Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
