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

        const role = ctx.role || "";
        const canApprove = ["ADMINISTRATOR", "ADMIN", "SUPER_ADMIN", "ACCOUNTS_HEAD", "MANAGER", "AREA_MANAGER"].includes(role);
        if (!canApprove) {
            return NextResponse.json(
                { success: false, error: "Only Managers and Administrators can approve personal loans" },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        const body = await req.json();
        const {
            action = "APPROVE",
            approvalRemarks = "",
            rejectionReason = "",
            adjustedLoanAmount,
            interestRatePercent,
            tenureUnits,
            repaymentFrequency,
        } = body;

        const loan = await PersonalLoan.findById(id);
        if (!loan) {
            return NextResponse.json(
                { success: false, error: "Loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(loan.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Loan belongs to another branch" },
                { status: 403 }
            );
        }

        if (action === "APPROVE") {
            // Check if amount or terms were adjusted during approval
            const newAmount = Number(adjustedLoanAmount) || loan.loanAmount;
            const newRate = interestRatePercent !== undefined ? Number(interestRatePercent) : loan.interestRatePercent;
            const newTenure = Number(tenureUnits) || loan.tenureUnits;
            const newFreq = repaymentFrequency || loan.repaymentFrequency;

            if (newAmount !== loan.loanAmount || newRate !== loan.interestRatePercent || newTenure !== loan.tenureUnits || newFreq !== loan.repaymentFrequency) {
                const schedule = generateAmortizationDues(
                    newAmount,
                    newRate,
                    loan.interestType,
                    newFreq,
                    newTenure,
                    new Date()
                );

                loan.loanAmount = newAmount;
                loan.interestRatePercent = newRate;
                loan.tenureUnits = newTenure;
                loan.repaymentFrequency = newFreq;
                loan.installmentAmount = schedule.installmentAmount;
                loan.totalInterest = schedule.totalInterest;
                loan.totalPayable = schedule.totalPayable;
                loan.principalOutstanding = newAmount;
                loan.interestOutstanding = schedule.totalInterest;
                loan.totalOutstanding = schedule.totalPayable;
                loan.netDisbursedAmount = Math.max(0, newAmount - (loan.processingFee + loan.documentationCharges));
                loan.dues = schedule.dues;
            }

            loan.status = "APPROVED";
            loan.approvalRemarks = approvalRemarks || "Sanction approved by management";
            loan.approvedBy = ctx.userId as unknown as typeof loan.approvedBy;
            loan.approvedAt = new Date();
        } else {
            loan.status = "REJECTED";
            loan.rejectionReason = rejectionReason || approvalRemarks || "Sanction rejected by management";
            loan.rejectedBy = ctx.userId as unknown as typeof loan.rejectedBy;
            loan.rejectedAt = new Date();
        }

        await loan.save();

        return NextResponse.json({
            success: true,
            message: `Loan successfully ${loan.status.toLowerCase()}`,
            loan,
        });
    } catch (error) {
        console.error("Personal loan approval error:", error);
        return NextResponse.json(
            { success: false, error: "Loan approval update failed" },
            { status: 500 }
        );
    }
}

