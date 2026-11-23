import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true, index: true },
        address: { type: String },
        manager: { type: String },
        phone: { type: String },
    },
    { timestamps: true }
);

BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ name: 1 });

export default mongoose.models.Branch ||
    mongoose.model("Branch", BranchSchema);
