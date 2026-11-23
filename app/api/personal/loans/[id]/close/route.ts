import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan, { IPersonalLoanDue } from "@/models/PersonalLoan";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;
        const body = await req.json();
        const {
            closureType = "NORMAL",
            settlementAmount,
            penaltyWaived = 0,
            interestDiscount = 0,
            paymentMethod = "CASH",
            closureRemarks = "",
        } = body;

        const loan = await PersonalLoan.findById(id);
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

        const payAmount = Number(settlementAmount) || 0;

        // If a settlement amount is paid during closure, create settlement collection receipt
        let collection = null;
        if (payAmount > 0) {
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

            const principalPart = Math.min(payAmount, loan.principalOutstanding);
            const interestPart = Math.max(0, payAmount - principalPart);

            collection = await PersonalLoanCollection.create({
                receiptNo,
                loan: loan._id,
                customer: loan.customer,
                personalAccount: loan.personalAccount,
                branchId: loan.branchId,
                collectedBy: ctx.userId,
                collectionType: "PRECLOSURE_SETTLEMENT",
                totalAmount: payAmount,
                principalPortion: principalPart,
                interestPortion: interestPart,
                penaltyPortion: 0,
                paymentMethod,
                transactionDate: new Date(),
                remarks: closureRemarks || `${closureType} settlement closure`,
                status: "APPROVED",
                approvedBy: ctx.userId,
                approvedAt: new Date(),
            });

            loan.totalPrincipalRepaid = (loan.totalPrincipalRepaid || 0) + principalPart;
            loan.totalInterestRepaid = (loan.totalInterestRepaid || 0) + interestPart;
        }

        // Mark remaining dues as settled
        for (const due of loan.dues as IPersonalLoanDue[]) {
            if (!due.isPaid) {
                due.isPaid = true;
                due.paidAt = new Date();
                due.status = "PAID";
                due.remainingAmount = 0;
            }
        }

        loan.principalOutstanding = 0;
        loan.interestOutstanding = 0;
        loan.penaltyOutstanding = 0;
        loan.totalOutstanding = 0;
        loan.status = closureType === "PRECLOSURE" ? "PRECLOSED" : "CLOSED";
        loan.closureType = closureType;
        loan.closureRemarks =
            closureRemarks ||
            `Closed via ${closureType}. Waived Interest: ₹${interestDiscount}, Waived Penalty: ₹${penaltyWaived}`;
        loan.closedBy = ctx.userId as unknown as typeof loan.closedBy;
        loan.closedAt = new Date();
        loan.nocIssued = true;
        loan.nocIssuedAt = new Date();

        await loan.save();

        return NextResponse.json({
            success: true,
            message: `Personal loan ${loan.status.toLowerCase()} successfully. NOC generated.`,
            loan,
            collection,
        });
    } catch (error) {
        console.error("Personal loan closure error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to close loan" },
            { status: 500 }
        );
    }
}

