import PersonalAccount from "@/models/PersonalAccount";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import mongoose from "mongoose";
import { PersonalLoanEligibilityResponse } from "@/types/personal-loan";

export async function evaluatePersonalLoanEligibility(
    accountIdOrNumber: string
): Promise<PersonalLoanEligibilityResponse | null> {
    // Ensure models are registered
    void PersonalClient;
    void PersonalScheme;
    void PersonalDeposit;
    void PersonalLoan;

    let accountQuery: Record<string, unknown> = {};
    if (mongoose.Types.ObjectId.isValid(accountIdOrNumber)) {
        accountQuery = { _id: new mongoose.Types.ObjectId(accountIdOrNumber) };
    } else {
        accountQuery = { accountNumber: accountIdOrNumber.trim() };
    }

    const account = await PersonalAccount.findOne(accountQuery)
        .populate("customer")
        .populate("scheme")
        .lean();

    if (!account) {
        return null;
    }

    const customer = account.customer as Record<string, unknown>;
    const scheme = account.scheme as Record<string, unknown>;

    // 1. Calculate Monthly Contribution
    const installmentAmount = Number(account.installmentAmount || scheme?.installmentAmount || 0);
    const frequency = (account.frequency || scheme?.frequency || "MONTHLY").toUpperCase();

    let monthlyContribution = installmentAmount;
    if (frequency === "DAILY") {
        monthlyContribution = installmentAmount * 30;
    } else if (frequency === "WEEKLY") {
        monthlyContribution = installmentAmount * 4;
    }

    const schemeMeetsMinimumDeposit = monthlyContribution >= 3000;

    // 2. Calculate Tenure (Account Age)
    const startDate = account.startDate ? new Date(account.startDate) : new Date(account.createdAt);
    const now = new Date();
    const ageInMs = now.getTime() - startDate.getTime();
    const accountAgeDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));
    const tenureMonthsCompleted = Number((accountAgeDays / 30).toFixed(1));
    const hasThreeMonthsTenure = accountAgeDays >= 85 || tenureMonthsCompleted >= 2.8;

    // 3. Check Approved Deposits across at least 3 distinct monthly cycles
    const deposits = await PersonalDeposit.find({
        account: account._id,
        status: { $in: ["APPROVED", null] },
    })
        .sort({ depositDate: 1 })
        .lean();

    const distinctMonthsSet = new Set<string>();
    let totalDepositedSum = 0;

    for (const d of deposits) {
        const dDate = d.depositDate ? new Date(d.depositDate) : new Date(d.createdAt);
        const yMonth = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, "0")}`;
        distinctMonthsSet.add(yMonth);
        totalDepositedSum += Number(d.amount || 0);
    }

    const approvedDepositMonthsCount = distinctMonthsSet.size;
    const approvedDepositCount = deposits.length;

    // Criteria: distinct deposit months >= 3 OR for weekly/daily, minimum 3 months equivalent deposit count
    const minRequiredInstallments =
        frequency === "DAILY" ? 70 : frequency === "WEEKLY" ? 12 : 3;

    const hasThreeApprovedMonths =
        approvedDepositMonthsCount >= 3 || approvedDepositCount >= minRequiredInstallments;

    // 4. Account Standing & Overdue Loan Check
    const accountStatusValid = account.status === "ACTIVE" || account.status === "MATURED";

    const customerId = customer?._id ? new mongoose.Types.ObjectId(String(customer._id)) : null;
    let noDefaultedLoans = true;
    let existingActiveLoan = null;

    if (customerId) {
        existingActiveLoan = await PersonalLoan.findOne({
            customer: customerId,
            status: { $in: ["OVERDUE", "ACTIVE"] },
        }).lean();

        if (existingActiveLoan && existingActiveLoan.status === "OVERDUE") {
            noDefaultedLoans = false;
        }
    }

    // Overall eligibility
    const isEligible =
        schemeMeetsMinimumDeposit &&
        hasThreeMonthsTenure &&
        hasThreeApprovedMonths &&
        accountStatusValid &&
        noDefaultedLoans;

    const reasons: string[] = [];
    if (!schemeMeetsMinimumDeposit) {
        reasons.push(
            `Scheme monthly contribution is ₹${monthlyContribution.toLocaleString("en-IN")}, which is below the minimum required ₹3,000/month.`
        );
    }
    if (!hasThreeMonthsTenure) {
        reasons.push(
            `Account age is only ${accountAgeDays} days (${tenureMonthsCompleted} months). At least 3 months (90 days) active tenure is required.`
        );
    }
    if (!hasThreeApprovedMonths) {
        reasons.push(
            `Approved deposits exist across only ${approvedDepositMonthsCount} distinct month(s) (total ${approvedDepositCount} installments). At least 3 approved monthly cycles are required.`
        );
    }
    if (!accountStatusValid) {
        reasons.push(`Account status is '${account.status}'. Only ACTIVE savings accounts qualify for a personal loan.`);
    }
    if (!noDefaultedLoans) {
        reasons.push(`Customer has an existing overdue/delinquent personal loan (${existingActiveLoan?.loanId || "Active Loan"}).`);
    }

    if (isEligible) {
        reasons.push(
            `Eligible! Savings scheme contribution is ₹${monthlyContribution.toLocaleString("en-IN")}/month with ${accountAgeDays} days of active savings across ${approvedDepositMonthsCount} verified monthly deposit cycles.`
        );
    }

    const totalDeposited = Math.max(Number(account.totalDeposited || 0), totalDepositedSum);
    // Guideline ceiling: 3x to 5x of total deposited savings
    const suggestedMaxCeiling = Math.max(25000, Math.round((totalDeposited * 4) / 1000) * 1000);

    return {
        isEligible,
        reasons,
        criteria: {
            schemeMeetsMinimumDeposit,
            monthlyContribution,
            accountAgeDays,
            tenureMonthsCompleted,
            hasThreeMonthsTenure,
            approvedDepositCount,
            approvedDepositMonthsCount,
            hasThreeApprovedMonths,
            accountStatusValid,
            noDefaultedLoans,
        },
        customer: {
            _id: String(customer?._id || ""),
            clientId: String(customer?.clientId || ""),
            fullName: String(customer?.fullName || ""),
            mobile: String(customer?.mobile || ""),
            address: String(customer?.address || ""),
            panNumber: String(customer?.panNumber || ""),
            idProofNumber: String(customer?.idProofNumber || ""),
            guarantorName: String(customer?.guarantorName || ""),
            guarantorMobile: String(customer?.guarantorMobile || ""),
            guarantorRelation: String(customer?.guarantorRelation || ""),
        },
        account: {
            _id: String(account._id),
            accountNumber: String(account.accountNumber),
            schemeName: String(scheme?.schemeName || "Smart Savings"),
            frequency: String(frequency),
            installmentAmount,
            startDate: account.startDate,
            totalDeposited,
            paidInstallments: Number(account.paidInstallments || approvedDepositCount),
            status: String(account.status),
        },
        suggestedMaxCeiling,
    };
}

