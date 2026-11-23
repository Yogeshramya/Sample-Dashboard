export type PlanFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type AccountStatus = "PENDING" | "ACTIVE" | "MATURED" | "SETTLEMENT_PENDING" | "SETTLED" | "CLOSED" | "REJECTED";

export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER";

export type SchemeType = "STANDARD" | "CUSTOM";

export interface PersonalClient {
    _id: string;
    clientId: string;
    fullName: string;
    mobile: string;
    address: string;
    occupation: string;
    monthlyIncome?: number;
    status: string;
    approvedBy?: {
        _id: string;
        name: string;
    } | string | null;
    approvedAt?: string;
    rejectedBy?: {
        _id: string;
        name: string;
    } | string | null;
    rejectedAt?: string;
    rejectedReason?: string;
    panNumber: string;
    panPhotoUrl?: string;
    idProofType: string;
    idProofNumber: string;
    idProofFrontUrl?: string;
    idProofBackUrl?: string;

    // Nominee / Guarantor Details
    guarantorName?: string;
    guarantorMobile?: string;
    guarantorRelation?: string;
    guarantorAddress?: string;
    guarantorAadhaar?: string;
    guarantorIdType?: string;
    nomineeName?: string;
    nomineeMobile?: string;
    nomineeRelation?: string;
    nomineeAddress?: string;
    nomineeAadhaar?: string;
    nomineeIdType?: string;

    branchId?: {
        _id: string;
        name: string;
    } | string;
    createdAt: string;
    updatedAt?: string;
}

export interface PersonalScheme {
    _id: string;
    schemeId: string;
    schemeName: string;
    schemeType?: SchemeType;
    frequency: PlanFrequency;
    installmentAmount: number;
    durationMonths: number;
    benefitMonths?: number;
    benefitWeeks?: number;
    benefitDays?: number;
    totalInstallments: number;
    totalContribution: number;
    benefitAmount: number;
    maturityAmount: number;
    status: "ACTIVE" | "INACTIVE";
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PersonalAccount {
    _id: string;
    accountNumber: string;
    customer: PersonalClient;
    scheme: PersonalScheme;
    branchId?: {
        _id: string;
        name: string;
    } | string;
    collectorId?: {
        _id: string;
        name: string;
        phone?: string;
        role?: string;
    } | null;
    frequency: PlanFrequency;
    installmentAmount: number;
    durationMonths: number;
    totalTargetInstallments: number;
    paidInstallments: number;
    totalDeposited: number;
    benefitAmount: number;
    maturityAmount: number;
    startDate: string;
    maturityDate: string;
    status: AccountStatus;
    approvedBy?: {
        _id: string;
        name: string;
    } | string | null;
    approvedAt?: string;
    rejectedBy?: {
        _id: string;
        name: string;
    } | string | null;
    rejectedAt?: string;
    rejectedReason?: string;
    settledBy?: {
        _id: string;
        name: string;
    } | string | null;
    settledAt?: string;
    settlementAmount?: number;
    nomineeName?: string;
    nomineeRelation?: string;
    nomineePhone?: string;
    remarks?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface PersonalDeposit {
    _id: string;
    receiptNo: string;
    account: PersonalAccount;
    customer: PersonalClient;
    branchId?: {
        _id: string;
        name: string;
    } | string;
    collectedBy?: {
        _id: string;
        name: string;
    } | null;
    installmentCount: number;
    amount: number;
    paymentMethod: PaymentMethod;
    depositDate: string;
    remarks?: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    approvedBy?: {
        _id: string;
        name: string;
    } | string | null;
    approvedAt?: string | null;
    rejectionReason?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface PersonalEmployee {
    _id: string;
    name: string;
    phone?: string;
    role?: string;
}

export interface SavingsMaturityCalculation {
    contribution: number;
    benefit: number;
    maturity: number;
}
