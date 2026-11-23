import { Schema, model, models } from "mongoose";

const AuditLogSchema = new Schema(
    {
        action: { type: String, required: true }, // CREATED / UPDATED / DELETED
        module: { type: String, required: true }, // credit, debit, fund etc.
        recordId: { type: String, required: true },
        performedById: { type: String, required: true },
        performedByName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ module: 1, timestamp: -1 });
AuditLogSchema.index({ performedById: 1 });
AuditLogSchema.index({ recordId: 1 });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
