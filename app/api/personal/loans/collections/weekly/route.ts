import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan, { IPersonalLoanDue } from "@/models/PersonalLoan";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();
        const {
            loanId,
            amount,
            installmentNo,
            paymentMethod = "CASH",
            remarks = "",
            penaltyPaid = 0,
        } = body;

        const totalPaid = Number(amount);
        if (!totalPaid || totalPaid <= 0) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid collection amount" },
                { status: 400 }
            );
        }

        const loan = await PersonalLoan.findById(loanId);
        if (!loan) {
            return NextResponse.json(
                { success: false, error: "Personal loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(loan.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Loan belongs to another branch" },
                { status: 403 }
            );
        }

        // Allocate payment: Penalties first, then next unpaid dues
        let remaining = totalPaid;
        const penaltyPortion = Math.min(Number(penaltyPaid) || 0, remaining);
        remaining -= penaltyPortion;

        let principalCollected = 0;
        let interestCollected = 0;
        let lastInstalNo = Number(installmentNo) || 1;

        for (const due of loan.dues as IPersonalLoanDue[]) {
            if (remaining <= 0) break;
            if (due.isPaid) continue;

            lastInstalNo = due.installmentNo;
            const dueRemaining = due.remainingAmount || due.totalDue - (due.paidAmount || 0);

            if (remaining >= dueRemaining) {
                const pDue = due.principalAmount - (due.principalPaid || 0);
                const iDue = due.interestAmount - (due.interestPaid || 0);

                due.principalPaid = (due.principalPaid || 0) + pDue;
                due.interestPaid = (due.interestPaid || 0) + iDue;
                due.paidAmount = due.totalDue;
                due.remainingAmount = 0;
                due.isPaid = true;
                due.paidAt = new Date();
                due.status = "PAID";

                principalCollected += pDue;
                interestCollected += iDue;
                remaining -= dueRemaining;
            } else {
                const totalD = due.totalDue || 1;
                const pRatio = due.principalAmount / totalD;
                const pPortion = Math.round(remaining * pRatio * 100) / 100;
                const iPortion = Math.round((remaining - pPortion) * 100) / 100;

                due.principalPaid = (due.principalPaid || 0) + pPortion;
                due.interestPaid = (due.interestPaid || 0) + iPortion;
                due.paidAmount = (due.paidAmount || 0) + remaining;
                due.remainingAmount = Math.max(0, due.totalDue - due.paidAmount);
                due.status = "PARTIAL";

                principalCollected += pPortion;
                interestCollected += iPortion;
                remaining = 0;
            }
        }

        if (remaining > 0) {
            principalCollected += remaining;
        }

        // Update loan running balances
        loan.totalPrincipalRepaid = (loan.totalPrincipalRepaid || 0) + principalCollected;
        loan.totalInterestRepaid = (loan.totalInterestRepaid || 0) + interestCollected;
        loan.totalPenaltyRepaid = (loan.totalPenaltyRepaid || 0) + penaltyPortion;
        loan.principalOutstanding = Math.max(0, loan.principalOutstanding - principalCollected);
        loan.interestOutstanding = Math.max(0, loan.interestOutstanding - interestCollected);
        loan.totalOutstanding = Math.max(0, loan.principalOutstanding + loan.interestOutstanding);

        // Check completion
        const allDuesPaid = loan.dues.every((d: IPersonalLoanDue) => d.isPaid);
        if (loan.totalOutstanding <= 0 || allDuesPaid) {
            loan.status = "CLOSED";
            loan.closedAt = new Date();
            loan.closedBy = ctx.userId as unknown as typeof loan.closedBy;
            loan.closureType = "NORMAL";
            loan.nocIssued = true;
            loan.nocIssuedAt = new Date();
        }

        await loan.save();

        // Create receipt record
        const date = new Date();
        const yMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

        const lastReceipt = await PersonalLoanCollection.findOne({
            receiptNo: new RegExp(`^PLR-${yMonth}-`),
        })
            .sort({ createdAt: -1 })
            .select("receiptNo")
            .lean();

        let nextSeq = 1;
        if (lastReceipt?.receiptNo) {
            const parts = lastReceipt.receiptNo.split("-");
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            if (!isNaN(parsed)) {
                nextSeq = parsed + 1;
            }
        }
        const receiptNo = `PLR-${yMonth}-${String(nextSeq).padStart(4, "0")}`;

        const collection = await PersonalLoanCollection.create({
            receiptNo,
            loan: loan._id,
            customer: loan.customer,
            personalAccount: loan.personalAccount,
            branchId: loan.branchId,
            collectedBy: ctx.userId,
            installmentNo: lastInstalNo,
            collectionType: loan.repaymentFrequency === "WEEKLY" ? "WEEKLY" : "MONTHLY",
            totalAmount: totalPaid,
            principalPortion: principalCollected,
            interestPortion: interestCollected,
            penaltyPortion,
            paymentMethod,
            transactionDate: new Date(),
            remarks: remarks || `${loan.repaymentFrequency} EMI installment collection`,
            status: "APPROVED",
            approvedBy: ctx.userId,
            approvedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "EMI installment collected successfully",
            collection,
            loan,
        });
    } catch (error) {
        console.error("Weekly personal loan collection error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to collect installment" },
            { status: 500 }
        );
    }
}

