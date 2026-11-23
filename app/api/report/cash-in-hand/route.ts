import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Credit from "@/models/Credit";
import Debit from "@/models/Debit";
import CashBox from "@/models/CashBox";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "Branch missing or unauthorized" },
                { status: 401 }
            );
        }

        const branchObjectId = ctx.branchObjectId;

        const todayIST = getTodayIST();
        const startOfDay = parseISTDate(todayIST, false);
        const endOfDay = parseISTDate(todayIST, true);

        /* Fetch yesterday closing balance as opening */
        const yesterday = new Date(startOfDay);
        yesterday.setDate(yesterday.getDate() - 1);

        const prevCash = await CashBox.findOne({
            date: { $lte: yesterday },
            branch: branchObjectId,
            module: { $ne: "PERSONAL" },
        }).sort({ date: -1 });

        const openingBalance = prevCash?.closingBalance || 0;

        /* Cash Income from Loan Dues Today */
        const duesAgg = await Loan.aggregate([
            { $match: { branch: branchObjectId } },
            { $unwind: "$dues" },
            {
                $match: {
                    "dues.paid": true,
                    "dues.paidAt": { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$dues.total" },
                },
            },
        ]);
        const loanCollected = duesAgg[0]?.total || 0;

        /* Cash Credits Today (MFI only) */
        const creditAgg = await Credit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    mode: "Cash",
                    status: "APPROVED",
                    module: { $ne: "PERSONAL" },
                    date: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const creditTotal = creditAgg[0]?.total || 0;

        /* Cash Debits Today (MFI only) */
        const debitAgg = await Debit.aggregate([
            {
                $match: {
                    branch: branchObjectId,
                    mode: "Cash",
                    status: "APPROVED",
                    module: { $ne: "PERSONAL" },
                    date: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const debitTotal = debitAgg[0]?.total || 0;

        const cashInHand = openingBalance + loanCollected + creditTotal - debitTotal;

        return NextResponse.json({
            success: true,
            data: {
                date: new Date().toISOString().split("T")[0],
                openingBalance,
                loanCollected,
                creditTotal,
                debitTotal,
                cashInHand,
            },
        });

    } catch (error) {
        console.error("Cash In Hand Error:", error);
        return NextResponse.json(
            { success: false, error },
            { status: 500 }
        );
    }
}
