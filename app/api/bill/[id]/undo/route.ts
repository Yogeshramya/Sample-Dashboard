import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import Loan from "@/models/Loan";
import { Dues } from "@/types/fund";
import { getToken } from "next-auth/jwt";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDB();

    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });

    const bill = await Bill.findById(id);

    if (!bill) {
        return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status !== "APPROVED") {
        return NextResponse.json(
            { error: "Only approved bills can be undone" },
            { status: 400 }
        );
    }

    for (const l of bill.loans) {
        const loan = await Loan.findOne({
            mfLoanId: l.loanId,
            branch: token?.branch?._id,
        });

        if (!loan) continue;

        const dueIndex = l.weekNo - 1;
        const due = loan.dues[dueIndex];

        if (!due) continue;

        // 1. Revert paid amount and remaining amount
        const currentPaid = due.paidAmount || 0;
        const revertedPaidAmount = Math.max(0, currentPaid - l.paidAmount);
        const totalDueAmount = due.total || 0;

        due.paidAmount = revertedPaidAmount;
        due.remainingAmount = totalDueAmount - revertedPaidAmount;

        // 2. Remove collection record added during approval
        loan.collections = loan.collections.filter(
            (c: { weekNo: number; amount: number }) =>
                !(c.weekNo === l.weekNo && c.amount === l.paidAmount)
        );

        // 3. Recalculate due status
        if (revertedPaidAmount <= 0) {
            due.paid = false;
            due.isPartial = false;
            due.paidAt = null;
            due.paidAmount = 0;
            due.remainingAmount = totalDueAmount;
        } else if (revertedPaidAmount < totalDueAmount) {
            due.paid = true;
            due.isPartial = true;
        } else {
            due.paid = true;
            due.isPartial = false;
        }

        // 4. Recalculate overall loan status
        const hasAnyPaid = loan.dues.some((d: Dues) => d.paid || (d.paidAmount && d.paidAmount > 0));
        const allFullyPaid = loan.dues.every((d: Dues) => d.paid && !d.isPartial);

        if (allFullyPaid) {
            loan.status = "REPAID";
        } else if (hasAnyPaid) {
            loan.status = "PARTIAL";
        } else {
            loan.status = "APPROVED";
        }

        await loan.save();
    }

    // Reset bill status to PENDING
    bill.status = "PENDING";
    await bill.save();

    return NextResponse.json({ success: true, message: "Bill approval undone successfully" });
}