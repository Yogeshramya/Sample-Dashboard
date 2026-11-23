import mongoose from "mongoose";

const DebitTitleSchema = new mongoose.Schema(
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

DebitTitleSchema.index({ title: 1, module: 1 }, { unique: true });

export default mongoose.models.DebitTitle ||
    mongoose.model("DebitTitle", DebitTitleSchema);
