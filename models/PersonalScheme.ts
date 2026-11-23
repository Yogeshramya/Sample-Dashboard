import mongoose, { Schema, Document } from "mongoose";

export interface IPersonalScheme extends Document {
    schemeId: string;
    schemeName: string;
    schemeType: "STANDARD" | "CUSTOM";
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    installmentAmount: number;
    durationMonths: number;
    benefitMonths: number;
    benefitWeeks: number;
    benefitDays: number;
    totalInstallments: number;
    totalContribution: number;
    benefitAmount: number;
    maturityAmount: number;
    status: "ACTIVE" | "INACTIVE";
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PersonalSchemeSchema = new Schema<IPersonalScheme>(
    {
        schemeId: { type: String, required: true, unique: true },
        schemeName: { type: String, required: true, trim: true },
        schemeType: {
            type: String,
            enum: ["STANDARD", "CUSTOM"],
            default: "STANDARD",
        },
        frequency: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY"],
            required: true,
            default: "DAILY",
        },
        installmentAmount: { type: Number, required: true },
        durationMonths: { type: Number, default: 12 },
        benefitMonths: { type: Number, default: 2 },
        benefitWeeks: { type: Number, default: 0 },
        benefitDays: { type: Number, default: 0 },
        totalInstallments: { type: Number, required: true },
        totalContribution: { type: Number, required: true },
        benefitAmount: { type: Number, required: true },
        maturityAmount: { type: Number, required: true },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        description: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.models.PersonalScheme ||
    mongoose.model<IPersonalScheme>("PersonalScheme", PersonalSchemeSchema);
