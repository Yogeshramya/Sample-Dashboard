export interface BranchShape {
    _id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
}

export type LoanRepaymentFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type LoanInterestType = "FLAT" | "REDUCING";
export type PersonalLoanStatus =
    | "APPLIED"
    | "PENDING_VERIFICATION"
    | "VERIFIED"
    | "APPROVED"
    | "REJECTED"
    | "DISBURSED"
    | "ACTIVE"
    | "OVERDUE"
    | "PRECLOSED"
    | "CLOSED";

export type DueInstallmentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";

export interface IPersonalLoanDueItem {
    installmentNo: number;
    dueDate: string | Date;
    principalAmount: number;
    interestAmount: number;
    totalDue: number;
    paidAmount: number;
    principalPaid: number;
    interestPaid: number;
    penaltyPaid: number;
    remainingAmount: number;
    isPaid: boolean;
    paidAt?: string | Date | null;
    status: DueInstallmentStatus;
}

export interface IPersonalLoanDocument {
    _id: string;
    loanId: string; // e.g. "PL-202611-0001"
    customer: {
        _id: string;
        clientId: string;
        fullName: string;
        mobile: string;
        address?: string;
        panNumber?: string;
        idProofNumber?: string;
    } | string;
    personalAccount: {
        _id: string;
        accountNumber: string;
        installmentAmount: number;
        frequency: string;
        totalDeposited?: number;
    } | string;
    scheme?: {
        _id: string;
        schemeId: string;
        schemeName: string;
        installmentAmount: number;
        frequency: string;
    } | string;
    branchId: BranchShape | string;
    collectorId?: {
        _id: string;
        name: string;
        phone?: string;
    } | string | null;

    // Financial Terms (Manual Sanction Entry)
    loanAmount: number;
    interestRatePercent: number;
    interestType: LoanInterestType;
    repaymentFrequency: LoanRepaymentFrequency;
    tenureUnits: number; // e.g., 100 days, 20 weeks, 12 months
    totalInterest: number;
    totalPayable: number;
    installmentAmount: number;
    processingFee: number;
    documentationCharges: number;
    netDisbursedAmount: number;

    // Running Balances
    principalOutstanding: number;
    interestOutstanding: number;
    penaltyOutstanding: number;
    totalOutstanding: number;
    totalPrincipalRepaid: number;
    totalInterestRepaid: number;
    totalPenaltyRepaid: number;

    // Schedule Dues
    dues: IPersonalLoanDueItem[];

    // Status & Workflow
    status: PersonalLoanStatus;
    purpose?: string;

    // Guarantor Snapshot
    guarantorName: string;
    guarantorMobile: string;
    guarantorRelation: string;
    guarantorAddress?: string;
    guarantorAadhaar?: string;

    // Verification
    verificationNotes?: string;
    verifiedBy?: { _id: string; name: string } | string | null;
    verifiedAt?: string | Date | null;

    // Approval
    approvedBy?: { _id: string; name: string } | string | null;
    approvedAt?: string | Date | null;
    approvalRemarks?: string;
    rejectedBy?: { _id: string; name: string } | string | null;
    rejectedAt?: string | Date | null;
    rejectionReason?: string;

    // Disbursement
    disbursedBy?: { _id: string; name: string } | string | null;
    disbursedAt?: string | Date | null;
    disbursementMethod?: "CASH" | "BANK_TRANSFER" | "UPI";
    disbursementVoucherNo?: string;
    bankReferenceNumber?: string;

    // Closure
    closedBy?: { _id: string; name: string } | string | null;
    closedAt?: string | Date | null;
    closureType?: "NORMAL" | "PRECLOSURE";
    closureRemarks?: string;
    nocIssued: boolean;
    nocIssuedAt?: string | Date | null;

    createdAt: string | Date;
    updatedAt: string | Date;
}

export type CollectionType = "DAILY" | "WEEKLY" | "MONTHLY" | "PRECLOSURE_SETTLEMENT";

export interface IPersonalLoanCollectionDocument {
    _id: string;
    receiptNo: string; // e.g. "PLR-202611-0001"
    loan: IPersonalLoanDocument | string;
    customer: {
        _id: string;
        clientId: string;
        fullName: string;
        mobile: string;
    } | string;
    personalAccount: {
        _id: string;
        accountNumber: string;
    } | string;
    branchId: BranchShape | string;
    collectedBy: {
        _id: string;
        name: string;
    } | string;

    installmentNo?: number;
    collectionType: CollectionType;

    totalAmount: number;
    principalPortion: number;
    interestPortion: number;
    penaltyPortion: number;

    paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER";
    transactionDate: string | Date;
    remarks?: string;

    status: "APPROVED" | "PENDING" | "REJECTED";
    approvedBy?: string | null;
    approvedAt?: string | Date | null;

    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PersonalLoanEligibilityCriteria {
    schemeMeetsMinimumDeposit: boolean;
    monthlyContribution: number;
    accountAgeDays: number;
    tenureMonthsCompleted: number;
    hasThreeMonthsTenure: boolean;
    approvedDepositCount: number;
    approvedDepositMonthsCount: number;
    hasThreeApprovedMonths: boolean;
    accountStatusValid: boolean;
    noDefaultedLoans: boolean;
}

export interface PersonalLoanEligibilityResponse {
    isEligible: boolean;
    reasons: string[];
    criteria: PersonalLoanEligibilityCriteria;
    customer: {
        _id: string;
        clientId: string;
        fullName: string;
        mobile: string;
        address?: string;
        panNumber?: string;
        idProofNumber?: string;
        guarantorName?: string;
        guarantorMobile?: string;
        guarantorRelation?: string;
    };
    account: {
        _id: string;
        accountNumber: string;
        schemeName: string;
        frequency: string;
        installmentAmount: number;
        startDate: string | Date;
        totalDeposited: number;
        paidInstallments: number;
        status: string;
    };
    suggestedMaxCeiling?: number;
}
