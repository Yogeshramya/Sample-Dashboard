import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import { evaluatePersonalLoanEligibility } from "@/lib/personal-loan-eligibility";
import { generateAmortizationDues } from "@/lib/personal-loan-calc";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        void PersonalClient;
        void PersonalScheme;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();
        const {
            personalAccountId,
            loanAmount,
            interestRatePercent = 12,
            interestType = "FLAT",
            repaymentFrequency = "DAILY",
            tenureUnits = 100,
            purpose = "",
            guarantorName,
            guarantorMobile,
            guarantorRelation,
            guarantorAddress = "",
            guarantorAadhaar = "",
            processingFee = 0,
            documentationCharges = 0,
            allowIneligibleOverride = false,
        } = body;

        const amount = Number(loanAmount);
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid loan sanction amount." },
                { status: 400 }
            );
        }

        if (!personalAccountId) {
            return NextResponse.json(
                { success: false, error: "Personal savings account is required." },
                { status: 400 }
            );
        }

        const account = await PersonalAccount.findById(personalAccountId)
            .populate("customer")
            .populate("scheme")
            .lean();

        if (!account) {
            return NextResponse.json(
                { success: false, error: "Savings account not found." },
                { status: 404 }
            );
        }

        // Branch check for non-admins
        if (!ctx.isAdmin) {
            const accBranchStr = String(account.branchId);
            if (accBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized: Account belongs to another branch." },
                    { status: 403 }
                );
            }
        }

        // Evaluate eligibility
        const eligibility = await evaluatePersonalLoanEligibility(String(account._id));
        if (!eligibility?.isEligible && !allowIneligibleOverride) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Customer is not eligible for a personal loan.",
                    reasons: eligibility?.reasons || [],
                },
                { status: 400 }
            );
        }

        // Generate next Loan ID
        const date = new Date();
        const yMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

        const lastLoan = await PersonalLoan.findOne({
            loanId: new RegExp(`^YPL-${yMonth}-`),
        })
            .sort({ createdAt: -1 })
            .select("loanId")
            .lean();

        let nextNumber = 1;
        if (lastLoan?.loanId) {
            const parts = lastLoan.loanId.split("-");
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
        const loanId = `YPL-${yMonth}-${String(nextNumber).padStart(4, "0")}`;

        // Compute Amortization Schedule
        const schedule = generateAmortizationDues(
            amount,
            Number(interestRatePercent),
            interestType,
            repaymentFrequency,
            Number(tenureUnits),
            new Date()
        );

        const fee = Number(processingFee) || 0;
        const docFee = Number(documentationCharges) || 0;
        const netDisbursed = Math.max(0, amount - (fee + docFee));

        const customerObj = account.customer as Record<string, unknown>;

        const newLoan = await PersonalLoan.create({
            loanId,
            customer: customerObj._id,
            personalAccount: account._id,
            scheme: account.scheme ? (account.scheme as Record<string, unknown>)._id : null,
            branchId: account.branchId || ctx.branchObjectId,
            collectorId: account.collectorId || null,

            loanAmount: amount,
            interestRatePercent: Number(interestRatePercent),
            interestType,
            repaymentFrequency,
            tenureUnits: Number(tenureUnits),
            installmentAmount: schedule.installmentAmount,
            totalInterest: schedule.totalInterest,
            totalPayable: schedule.totalPayable,
            processingFee: fee,
            documentationCharges: docFee,
            netDisbursedAmount: netDisbursed,

            principalOutstanding: amount,
            interestOutstanding: schedule.totalInterest,
            penaltyOutstanding: 0,
            totalOutstanding: schedule.totalPayable,
            totalPrincipalRepaid: 0,
            totalInterestRepaid: 0,
            totalPenaltyRepaid: 0,

            dues: schedule.dues,

            status: "APPLIED",
            purpose,

            guarantorName: guarantorName || customerObj.guarantorName || "Self",
            guarantorMobile: guarantorMobile || customerObj.guarantorMobile || customerObj.mobile,
            guarantorRelation: guarantorRelation || customerObj.guarantorRelation || "Family",
            guarantorAddress: guarantorAddress || customerObj.guarantorAddress || customerObj.address || "",
            guarantorAadhaar: guarantorAadhaar || customerObj.guarantorAadhaar || "",
        });

        return NextResponse.json({
            success: true,
            message: "Personal loan application submitted successfully",
            loan: newLoan,
        });
    } catch (error) {
        console.error("Personal loan application error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to submit loan application" },
            { status: 500 }
        );
    }
}

