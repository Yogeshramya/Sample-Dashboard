import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRemittance extends Document {
    date: Date;
    fromBranch: mongoose.Types.ObjectId;
    toBranch: mongoose.Types.ObjectId;
    amount: number;
    mode: "Cash" | "Bank";
    details: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    remittanceType: "INTER_BRANCH" | "INTER_MODULE";
    fromModule: "MFI" | "PERSONAL";
    toModule: "MFI" | "PERSONAL";
    requestedBy?: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const RemittanceSchema: Schema<IRemittance> = new Schema(
    {
        date: {
            type: Date,
            required: [true, "Date is required"],
            default: Date.now,
        },
        fromBranch: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: [true, "Source branch is required"],
        },
        toBranch: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: [true, "Target branch is required"],
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [1, "Amount must be at least 1"],
        },
        mode: {
            type: String,
            enum: ["Cash", "Bank"],
            default: "Cash",
            required: true,
        },
        details: {
            type: String,
            required: [true, "Details are required"],
            trim: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
            required: true,
            index: true,
        },
        remittanceType: {
            type: String,
            enum: ["INTER_BRANCH", "INTER_MODULE"],
            default: "INTER_BRANCH",
            index: true,
        },
        fromModule: {
            type: String,
            enum: ["MFI", "PERSONAL"],
            default: "MFI",
            index: true,
        },
        toModule: {
            type: String,
            enum: ["MFI", "PERSONAL"],
            default: "MFI",
            index: true,
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Remittance: Model<IRemittance> =
    mongoose.models.Remittance ||
    mongoose.model<IRemittance>("Remittance", RemittanceSchema);

export default Remittance;
