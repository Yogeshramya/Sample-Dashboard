import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan from "@/models/PersonalLoan";
import { generateAmortizationDues } from "@/lib/personal-loan-calc";

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
            disbursementMethod = "CASH",
            disbursementVoucherNo = "",
            bankReferenceNumber = "",
            firstDueDate,
        } = body;

        const loan = await PersonalLoan.findById(id);
        if (!loan) {
            return NextResponse.json(
                { success: false, error: "Loan not found" },
                { status: 404 }
            );
        }

        if (loan.status !== "APPROVED") {
            return NextResponse.json(
                { success: false, error: `Only APPROVED loans can be disbursed. Current status: ${loan.status}` },
                { status: 400 }
            );
        }

        if (!ctx.isAdmin && String(loan.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Loan belongs to another branch" },
                { status: 403 }
            );
        }

        const disbDate = new Date();
        const startDateForSchedule = firstDueDate ? new Date(firstDueDate) : disbDate;

        // Generate finalized amortization dues schedule anchored on disbursement date
        const schedule = generateAmortizationDues(
            loan.loanAmount,
            loan.interestRatePercent,
            loan.interestType,
            loan.repaymentFrequency,
            loan.tenureUnits,
            startDateForSchedule
        );

        loan.dues = schedule.dues;
        loan.installmentAmount = schedule.installmentAmount;
        loan.totalInterest = schedule.totalInterest;
        loan.totalPayable = schedule.totalPayable;
        loan.principalOutstanding = loan.loanAmount;
        loan.interestOutstanding = schedule.totalInterest;
        loan.totalOutstanding = schedule.totalPayable;
        loan.netDisbursedAmount = Math.max(0, loan.loanAmount - (loan.processingFee + loan.documentationCharges));

        loan.status = "ACTIVE";
        loan.disbursedBy = ctx.userId as unknown as typeof loan.disbursedBy;
        loan.disbursedAt = disbDate;
        loan.disbursementMethod = disbursementMethod;
        loan.disbursementVoucherNo = disbursementVoucherNo || `PV-${loan.loanId}`;
        loan.bankReferenceNumber = bankReferenceNumber;

        await loan.save();

        return NextResponse.json({
            success: true,
            message: "Personal loan disbursed successfully. Net payout has been registered.",
            loan,
        });
    } catch (error) {
        console.error("Personal loan disbursement error:", error);
        return NextResponse.json(
            { success: false, error: "Disbursement failed" },
            { status: 500 }
        );
    }
}

