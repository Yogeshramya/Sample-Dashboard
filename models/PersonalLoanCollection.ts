import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalLoanCollection extends Document {
    receiptNo: string;
    loan: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
    personalAccount: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    collectedBy: mongoose.Types.ObjectId;

    installmentNo?: number;
    collectionType: "DAILY" | "WEEKLY" | "MONTHLY" | "PRECLOSURE_SETTLEMENT";

    totalAmount: number;
    principalPortion: number;
    interestPortion: number;
    penaltyPortion: number;

    paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER";
    transactionDate: Date;
    remarks?: string;

    status: "APPROVED" | "PENDING" | "REJECTED";
    approvedBy?: mongoose.Types.ObjectId | null;
    approvedAt?: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

const PersonalLoanCollectionSchema = new Schema<IPersonalLoanCollection>(
    {
        receiptNo: { type: String, required: true, unique: true, index: true },
        loan: { type: Schema.Types.ObjectId, ref: "PersonalLoan", required: true, index: true },
        customer: { type: Schema.Types.ObjectId, ref: "PersonalClient", required: true, index: true },
        personalAccount: { type: Schema.Types.ObjectId, ref: "PersonalAccount", required: true, index: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
        collectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

        installmentNo: { type: Number },
        collectionType: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY", "PRECLOSURE_SETTLEMENT"],
            required: true,
            default: "DAILY",
        },

        totalAmount: { type: Number, required: true },
        principalPortion: { type: Number, required: true, default: 0 },
        interestPortion: { type: Number, required: true, default: 0 },
        penaltyPortion: { type: Number, default: 0 },

        paymentMethod: {
            type: String,
            enum: ["CASH", "UPI", "BANK_TRANSFER"],
            default: "CASH",
        },
        transactionDate: { type: Date, default: Date.now, index: true },
        remarks: { type: String, default: "" },

        status: {
            type: String,
            enum: ["APPROVED", "PENDING", "REJECTED"],
            default: "APPROVED",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.models.PersonalLoanCollection ||
    mongoose.model<IPersonalLoanCollection>("PersonalLoanCollection", PersonalLoanCollectionSchema);

