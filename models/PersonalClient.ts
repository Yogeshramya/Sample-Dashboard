import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalClient extends Document {
    clientId: string;
    fullName: string;
    mobile: string;
    address: string;
    occupation: string;
    monthlyIncome: number;
    status: string; // "PENDING" | "APPROVED" | "REJECTED" | "No Active Loan" | "Registered"
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectedReason?: string;

    // PAN & ID Proof Details
    panNumber: string;
    panPhotoUrl?: string;
    idProofType: string;
    idProofNumber: string;
    idProofFrontUrl?: string;
    idProofBackUrl?: string;

    // Guarantor Details
    guarantorName: string;
    guarantorMobile: string;
    guarantorRelation: string;
    guarantorAddress: string;
    guarantorAadhaar: string;
    guarantorIdType: string;
    guarantorAadhaarPhotoUrl?: string;
    guarantorIdFrontUrl?: string;
    guarantorIdBackUrl?: string;

    branchId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PersonalClientSchema = new Schema<IPersonalClient>(
    {
        clientId: { type: String, required: true, unique: true },
        fullName: { type: String, required: true, trim: true },
        mobile: { type: String, required: true, unique: true },
        address: { type: String, required: true },
        occupation: { type: String, required: true },
        monthlyIncome: { type: Number, required: true },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "No Active Loan", "Registered"],
            default: "PENDING",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectedAt: { type: Date, default: null },
        rejectedReason: { type: String, default: "" },

        panNumber: { type: String, default: "NOTPROVIDED", uppercase: true },
        panPhotoUrl: { type: String },
        idProofType: { type: String, required: true },
        idProofNumber: { type: String, required: true },
        idProofFrontUrl: { type: String },
        idProofBackUrl: { type: String },

        guarantorName: { type: String, required: true },
        guarantorMobile: { type: String, required: true },
        guarantorRelation: { type: String, required: true },
        guarantorAddress: { type: String, required: true },
        guarantorAadhaar: { type: String },
        guarantorIdType: { type: String },
        guarantorAadhaarPhotoUrl: { type: String },
        guarantorIdFrontUrl: { type: String },
        guarantorIdBackUrl: { type: String },

        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    },
    { timestamps: true }
);

export default mongoose.models.PersonalClient ||
    mongoose.model<IPersonalClient>("PersonalClient", PersonalClientSchema);
