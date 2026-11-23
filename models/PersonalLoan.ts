import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalLoanDue {
    installmentNo: number;
    dueDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalDue: number;
    paidAmount: number;
    principalPaid: number;
    interestPaid: number;
    penaltyPaid: number;
    remainingAmount: number;
    isPaid: boolean;
    paidAt?: Date | null;
    status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
}

export interface IPersonalLoan extends Document {
    loanId: string;
    customer: mongoose.Types.ObjectId;
    personalAccount: mongoose.Types.ObjectId;
    scheme?: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    collectorId?: mongoose.Types.ObjectId | null;

    // Financial Terms (Manual Sanction Entry)
    loanAmount: number;
    interestRatePercent: number;
    interestType: "FLAT" | "REDUCING";
    repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    tenureUnits: number;
    installmentAmount: number;
    totalInterest: number;
    totalPayable: number;
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
    dues: IPersonalLoanDue[];

    // Lifecycle Status
    status:
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

    purpose?: string;

    // Guarantor Snapshot
    guarantorName: string;
    guarantorMobile: string;
    guarantorRelation: string;
    guarantorAddress?: string;
    guarantorAadhaar?: string;

    // Verification
    verificationNotes?: string;
    verifiedBy?: mongoose.Types.ObjectId | null;
    verifiedAt?: Date | null;

    // Approval
    approvedBy?: mongoose.Types.ObjectId | null;
    approvedAt?: Date | null;
    approvalRemarks?: string;
    rejectedBy?: mongoose.Types.ObjectId | null;
    rejectedAt?: Date | null;
    rejectionReason?: string;

    // Disbursement
    disbursedBy?: mongoose.Types.ObjectId | null;
    disbursedAt?: Date | null;
    disbursementMethod?: "CASH" | "BANK_TRANSFER" | "UPI";
    disbursementVoucherNo?: string;
    bankReferenceNumber?: string;

    // Closure
    closedBy?: mongoose.Types.ObjectId | null;
    closedAt?: Date | null;
    closureType?: "NORMAL" | "PRECLOSURE";
    closureRemarks?: string;
    nocIssued: boolean;
    nocIssuedAt?: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

const PersonalLoanDueSchema = new Schema<IPersonalLoanDue>(
    {
        installmentNo: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        principalAmount: { type: Number, required: true, default: 0 },
        interestAmount: { type: Number, required: true, default: 0 },
        totalDue: { type: Number, required: true, default: 0 },
        paidAmount: { type: Number, default: 0 },
        principalPaid: { type: Number, default: 0 },
        interestPaid: { type: Number, default: 0 },
        penaltyPaid: { type: Number, default: 0 },
        remainingAmount: { type: Number, default: 0 },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ["PENDING", "PAID", "PARTIAL", "OVERDUE"],
            default: "PENDING",
        },
    },
    { _id: false }
);

const PersonalLoanSchema = new Schema<IPersonalLoan>(
    {
        loanId: { type: String, required: true, unique: true, index: true },
        customer: { type: Schema.Types.ObjectId, ref: "PersonalClient", required: true, index: true },
        personalAccount: { type: Schema.Types.ObjectId, ref: "PersonalAccount", required: true, index: true },
        scheme: { type: Schema.Types.ObjectId, ref: "PersonalScheme" },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
        collectorId: { type: Schema.Types.ObjectId, ref: "User", default: null },

        loanAmount: { type: Number, required: true },
        interestRatePercent: { type: Number, required: true, default: 0 },
        interestType: {
            type: String,
            enum: ["FLAT", "REDUCING"],
            default: "FLAT",
        },
        repaymentFrequency: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY"],
            required: true,
            default: "DAILY",
        },
        tenureUnits: { type: Number, required: true, default: 100 },
        installmentAmount: { type: Number, required: true, default: 0 },
        totalInterest: { type: Number, default: 0 },
        totalPayable: { type: Number, required: true },
        processingFee: { type: Number, default: 0 },
        documentationCharges: { type: Number, default: 0 },
        netDisbursedAmount: { type: Number, default: 0 },

        principalOutstanding: { type: Number, required: true, default: 0 },
        interestOutstanding: { type: Number, default: 0 },
        penaltyOutstanding: { type: Number, default: 0 },
        totalOutstanding: { type: Number, required: true, default: 0 },
        totalPrincipalRepaid: { type: Number, default: 0 },
        totalInterestRepaid: { type: Number, default: 0 },
        totalPenaltyRepaid: { type: Number, default: 0 },

        dues: [PersonalLoanDueSchema],

        status: {
            type: String,
            enum: [
                "APPLIED",
                "PENDING_VERIFICATION",
                "VERIFIED",
                "APPROVED",
                "REJECTED",
                "DISBURSED",
                "ACTIVE",
                "OVERDUE",
                "PRECLOSED",
                "CLOSED",
            ],
            default: "APPLIED",
            index: true,
        },
        purpose: { type: String, default: "" },

        guarantorName: { type: String, required: true },
        guarantorMobile: { type: String, required: true },
        guarantorRelation: { type: String, required: true },
        guarantorAddress: { type: String, default: "" },
        guarantorAadhaar: { type: String, default: "" },

        verificationNotes: { type: String, default: "" },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        verifiedAt: { type: Date, default: null },

        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        approvalRemarks: { type: String, default: "" },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: "" },

        disbursedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        disbursedAt: { type: Date, default: null },
        disbursementMethod: {
            type: String,
            enum: ["CASH", "BANK_TRANSFER", "UPI"],
            default: "CASH",
        },
        disbursementVoucherNo: { type: String, default: "" },
        bankReferenceNumber: { type: String, default: "" },

        closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        closedAt: { type: Date, default: null },
        closureType: {
            type: String,
            enum: ["NORMAL", "PRECLOSURE"],
            default: "NORMAL",
        },
        closureRemarks: { type: String, default: "" },
        nocIssued: { type: Boolean, default: false },
        nocIssuedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.models.PersonalLoan ||
    mongoose.model<IPersonalLoan>("PersonalLoan", PersonalLoanSchema);

