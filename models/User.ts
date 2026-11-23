import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        profileImage: { type: String, default: "" },
        role: {
            type: String,
            enum: [
                "ADMINISTRATOR",
                "ACCOUNTS_HEAD",
                "AREA_MANAGER",
                "MANAGER",
                "EMPLOYEE_MFI",
                "TELLER"
            ],
            default: "EMPLOYEE_MFI"
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch"
        },
        branches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Branch"
            }
        ],
        // Employee Profile & HR Details
        employeeId: { type: String, default: "" },
        fatherName: { type: String, default: "" },
        age: { type: Number },
        dob: { type: String, default: "" },
        designation: { type: String, default: "" },
        department: { type: String, default: "Operations" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        joiningDate: { type: String, default: "" },
        bankName: { type: String, default: "" },
        bankAccountNo: { type: String, default: "" },
        panNo: { type: String, default: "" },
        pfNo: { type: String, default: "" },
        esiNo: { type: String, default: "" },
        basicSalary: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        da: { type: Number, default: 0 },
        travellingAllowance: { type: Number, default: 0 },
        accumulatedStaffDeposit: { type: Number, default: 0 },
        remainingLeave: { type: Number, default: 0 }
    },
    { timestamps: true }
);

if (models.User && models.User.schema && models.User.schema.path("role")) {
    const rolePath = models.User.schema.path("role") as unknown as { enumValues?: string[] };
    if (rolePath?.enumValues && !rolePath.enumValues.includes("ACCOUNTS_HEAD")) {
        rolePath.enumValues.push("ACCOUNTS_HEAD");
    }
}

export default models.User || mongoose.model("User", UserSchema);
