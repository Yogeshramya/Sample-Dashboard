import mongoose from "mongoose";

const CreditTitleSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        module: {
            type: String,
            enum: ["MFI", "PERSONAL"],
            default: "MFI",
            index: true,
        },
    },
    { timestamps: true }
);

CreditTitleSchema.index({ title: 1, module: 1 }, { unique: true });

export default mongoose.models.CreditTitle ||
    mongoose.model("CreditTitle", CreditTitleSchema);
