import mongoose, { Schema, models } from "mongoose";

const EarningsBreakdownSchema = new Schema(
    {
        full: { type: Number, default: 0 },
        actual: { type: Number, default: 0 },
    },
    { _id: false }
);

const SalarySchema = new Schema(
    {
        slipId: { type: String, required: true, index: true }, // e.g. "3644" or "YPS-202609-01"
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        employeeName: { type: String, required: true },
        employeeCode: { type: String, default: "" }, // e.g. RPMFI-C240, YPS001
        fatherName: { type: String, default: "" },
        designation: { type: String, default: "" },
        department: { type: String, default: "Loans" },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
        },
        branchName: { type: String, default: "" },

        // Bank & Statutory identifiers
        bankName: { type: String, default: "STATE BANK OF INDIA" },
        bankAccountNo: { type: String, default: "" },
        panNo: { type: String, default: "" },
        pfNo: { type: String, default: "" },
        esiNo: { type: String, default: "" },

        // Pay Period and Cycle
        payPeriod: { type: String, required: true }, // e.g. "September 2026"
        cycleStartDate: { type: String, default: "" }, // e.g. "26-AUG-2026"
        cycleEndDate: { type: String, default: "" }, // e.g. "25-SEP-2026"
        date: { type: String, required: true }, // e.g. "30/09/2026" or "25/09/2026" for table display

        // Attendance & Days
        workingDays: { type: Number, default: 30 },
        presentDays: { type: Number, default: 0 },
        leaveDays: { type: Number, default: 0 },
        absentDays: { type: Number, default: 0 }, // LOP Days
        remainingLeave: { type: Number, default: 0 },

        // Daily salary rate
        dailySalary: { type: Number, default: 0 },

        // Earnings
        basicSalary: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        hra: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        da: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        travellingAllowance: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        increment: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        overtime: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        bonus: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        incentive: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },
        totalEarnings: { type: EarningsBreakdownSchema, default: () => ({ full: 0, actual: 0 }) },

        // Deductions
        penalty: { type: Number, default: 0 },
        otherDeduction: { type: Number, default: 0 },
        providentFund: { type: Number, default: 0 },
        esi: { type: Number, default: 0 },
        professionalTax: { type: Number, default: 0 },
        advance: { type: Number, default: 0 },
        lop: { type: Number, default: 0 }, // Leave / Absent Deduction
        personalLoan: { type: Number, default: 0 },
        staffDeposit: { type: Number, default: 500 }, // Monthly deposit retention
        totalDeductions: { type: Number, default: 0 },

        // Net payout
        netSalary: { type: Number, required: true },
        amountInWords: { type: String, default: "" },
        accumulatedStaffDeposit: { type: Number, default: 0 },

        // Signatures & Metadata
        preparedBy: { type: String, default: "SARANYA" },
        checkedBy: { type: String, default: "NANDHINI" },
        approvedBy: { type: String, default: "VIGNESH" },
        status: {
            type: String,
            enum: ["ISSUED", "PAID", "PROCESSED", "PENDING"],
            default: "ISSUED",
        },
        notes: { type: String, default: "" },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default models.Salary || mongoose.model("Salary", SalarySchema);
