import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalDeposit extends Document {
    receiptNo: string;
    account: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
    branchId?: mongoose.Types.ObjectId;
    collectedBy?: mongoose.Types.ObjectId;
    installmentCount: number;
    amount: number;
    paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER";
    depositDate: Date;
    remarks?: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PersonalDepositSchema = new Schema<IPersonalDeposit>(
    {
        receiptNo: { type: String, required: true, unique: true },
        account: { type: Schema.Types.ObjectId, ref: "PersonalAccount", required: true },
        customer: { type: Schema.Types.ObjectId, ref: "PersonalClient", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
        collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
        installmentCount: { type: Number, required: true, default: 1 },
        amount: { type: Number, required: true },
        paymentMethod: {
            type: String,
            enum: ["CASH", "UPI", "BANK_TRANSFER"],
            default: "CASH",
        },
        depositDate: { type: Date, default: Date.now },
        remarks: { type: String, default: "" },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
        rejectionReason: { type: String, default: "" },
    },
    { timestamps: true }
);

if (mongoose.models && mongoose.models.PersonalDeposit) {
    if (!mongoose.models.PersonalDeposit.schema.path("status")) {
        delete mongoose.models.PersonalDeposit;
    }
}

const PersonalDeposit =
    mongoose.models.PersonalDeposit ||
    mongoose.model<IPersonalDeposit>("PersonalDeposit", PersonalDepositSchema);

if (!PersonalDeposit.schema.path("status")) {
    PersonalDeposit.schema.add({
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
        rejectionReason: { type: String, default: "" },
    });
}

export default PersonalDeposit;
