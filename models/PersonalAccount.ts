import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalAccount extends Document {
    accountNumber: string;
    customer: mongoose.Types.ObjectId;
    scheme: mongoose.Types.ObjectId;
    branchId?: mongoose.Types.ObjectId;
    collectorId?: mongoose.Types.ObjectId;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    installmentAmount: number;
    durationMonths: number;
    totalTargetInstallments: number;
    paidInstallments: number;
    totalDeposited: number;
    benefitAmount: number;
    maturityAmount: number;
    startDate: Date;
    maturityDate: Date;
    status: "PENDING" | "ACTIVE" | "MATURED" | "SETTLEMENT_PENDING" | "SETTLED" | "CLOSED" | "REJECTED";
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectedReason?: string;
    settledBy?: mongoose.Types.ObjectId;
    settledAt?: Date;
    settlementAmount?: number;
    nomineeName?: string;
    nomineeRelation?: string;
    nomineePhone?: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PersonalAccountSchema = new Schema<IPersonalAccount>(
    {
        accountNumber: { type: String, required: true, unique: true },
        customer: { type: Schema.Types.ObjectId, ref: "PersonalClient", required: true },
        scheme: { type: Schema.Types.ObjectId, ref: "PersonalScheme", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
        collectorId: { type: Schema.Types.ObjectId, ref: "User" },
        frequency: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY"],
            required: true,
            default: "DAILY",
        },
        installmentAmount: { type: Number, required: true },
        durationMonths: { type: Number, default: 12 },
        totalTargetInstallments: { type: Number, required: true },
        paidInstallments: { type: Number, default: 0 },
        totalDeposited: { type: Number, default: 0 },
        benefitAmount: { type: Number, required: true },
        maturityAmount: { type: Number, required: true },
        startDate: { type: Date, required: true, default: Date.now },
        maturityDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ["PENDING", "ACTIVE", "MATURED", "SETTLEMENT_PENDING", "SETTLED", "CLOSED", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectedAt: { type: Date, default: null },
        rejectedReason: { type: String, default: "" },
        settledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        settledAt: { type: Date, default: null },
        settlementAmount: { type: Number, default: 0 },

        nomineeName: { type: String },
        nomineeRelation: { type: String },
        nomineePhone: { type: String },
        remarks: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.models.PersonalAccount ||
    mongoose.model<IPersonalAccount>("PersonalAccount", PersonalAccountSchema);
