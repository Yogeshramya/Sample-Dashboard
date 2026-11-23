import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Salary from "@/models/Salary";
import { calculatePayroll } from "@/lib/payroll";

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only ADMINISTRATOR can determine, calculate and issue salary
        if (token.role !== "ADMINISTRATOR") {
            return NextResponse.json(
                { success: false, error: "Access denied: Only administrators can issue salary slips" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            employeeId,
            payPeriod,
            cycleStartDate,
            cycleEndDate,
            date,
            workingDays = 30,
            presentDays = 0,
            leaveDays = 0,
            absentDays = 0,
            remainingLeave = 0,
            basic = 0,
            hra = 0,
            da = 0,
            travelling = 0,
            increment = 0,
            overtime = 0,
            bonus = 0,
            incentive = 0,
            includePF = true,
            pfAmount,
            includeESI = true,
            esiAmount,
            staffDeposit = 500,
            advance = 0,
            penalty = 0,
            personalLoan = 0,
            otherDeductions = 0,
            professionalTax = 0,
            preparedBy = "SARANYA",
            checkedBy = "NANDHINI",
            approvedBy = "VIGNESH",
            customSlipId,
            notes = "",
        } = body;

        if (!employeeId || !payPeriod) {
            return NextResponse.json(
                { success: false, error: "Employee and Pay Period are required" },
                { status: 400 }
            );
        }

        const employee = await User.findById(employeeId).populate("branch");
        if (!employee) {
            return NextResponse.json(
                { success: false, error: "Employee not found" },
                { status: 404 }
            );
        }

        // Generate Slip ID if not provided (4-digit format like 3644, 3951 or timestamp-based)
        let slipId = customSlipId?.trim();
        if (!slipId) {
            const count = await Salary.countDocuments();
            slipId = String(3600 + count + 1);
        }

        // Normalize attendance days with support for half days (.5, 0.5, 29.5)
        const workingDaysNum = Number(workingDays) > 0 ? Number(workingDays) : 30;
        let absentDaysNum = Number(absentDays) || 0;
        let presentDaysNum = Number(presentDays) || 0;
        const leaveDaysNum = Number(leaveDays) || 0;

        // Ensure consistency if one was provided with decimal/half-day but the other wasn't set
        if (absentDaysNum === 0 && presentDaysNum > 0 && presentDaysNum < workingDaysNum) {
            absentDaysNum = Math.max(0, Math.round((workingDaysNum - presentDaysNum - leaveDaysNum) * 10) / 10);
        } else if (presentDaysNum === 0 && absentDaysNum > 0 && absentDaysNum < workingDaysNum) {
            presentDaysNum = Math.max(0, Math.round((workingDaysNum - absentDaysNum - leaveDaysNum) * 10) / 10);
        }

        // Compute payroll figures with guaranteed precision
        const calc = calculatePayroll({
            basic: Number(basic),
            hra: Number(hra),
            da: Number(da),
            travelling: Number(travelling),
            increment: Number(increment),
            overtime: Number(overtime),
            bonus: Number(bonus),
            incentive: Number(incentive),
            totalDays: workingDaysNum,
            absentDays: absentDaysNum,
            includePF: Boolean(includePF),
            pfAmount: pfAmount !== undefined ? Number(pfAmount) : undefined,
            includeESI: Boolean(includeESI),
            esiAmount: esiAmount !== undefined ? Number(esiAmount) : undefined,
            staffDeposit: Number(staffDeposit),
            advance: Number(advance),
            penalty: Number(penalty),
            personalLoan: Number(personalLoan),
            otherDeductions: Number(otherDeductions),
            professionalTax: Number(professionalTax),
        });

        // Compute cumulative staff deposit
        const currentAccumulated = Number(employee.accumulatedStaffDeposit) || 0;
        const newAccumulated = currentAccumulated + calc.staffDeposit;

        const newSalary = await Salary.create({
            slipId,
            employee: employee._id,
            employeeName: employee.name,
            employeeCode: employee.employeeId || employee.email?.split("@")[0]?.toUpperCase() || `YPS-${employee._id.toString().slice(-4)}`,
            fatherName: employee.fatherName || "",
            designation: employee.designation || employee.role || "Staff",
            department: employee.department || "Operations",
            branch: employee.branch?._id || null,
            branchName: employee.branch?.name || "Main Branch",

            bankName: employee.bankName || "STATE BANK OF INDIA",
            bankAccountNo: employee.bankAccountNo || "123456789012",
            panNo: employee.panNo || "ABCDE1234F",
            pfNo: employee.pfNo || "101234567890",
            esiNo: employee.esiNo || "1234567890",

            payPeriod,
            cycleStartDate: cycleStartDate || "",
            cycleEndDate: cycleEndDate || "",
            date: date || new Date().toLocaleDateString("en-GB"), // DD/MM/YYYY

            workingDays: workingDaysNum,
            presentDays: presentDaysNum,
            leaveDays: leaveDaysNum,
            absentDays: absentDaysNum,
            remainingLeave: Number(remainingLeave),

            dailySalary: calc.dailySalary,

            basicSalary: { full: Number(basic), actual: Number(basic) },
            hra: { full: Number(hra), actual: Number(hra) },
            da: { full: Number(da), actual: Number(da) },
            travellingAllowance: { full: Number(travelling), actual: Number(travelling) },
            increment: { full: Number(increment), actual: Number(increment) },
            overtime: { full: Number(overtime), actual: Number(overtime) },
            bonus: { full: Number(bonus), actual: Number(bonus) },
            incentive: { full: Number(incentive), actual: Number(incentive) },
            totalEarnings: { full: calc.totalEarnings, actual: calc.totalEarnings },

            penalty: calc.penalty,
            otherDeduction: calc.otherDeductions,
            providentFund: calc.pf,
            esi: calc.esi,
            professionalTax: calc.professionalTax,
            advance: calc.advance,
            lop: calc.lop,
            personalLoan: calc.personalLoan,
            staffDeposit: calc.staffDeposit,
            totalDeductions: calc.totalDeductions,

            netSalary: calc.netSalary,
            amountInWords: calc.amountInWords,
            accumulatedStaffDeposit: newAccumulated,

            preparedBy,
            checkedBy,
            approvedBy,
            status: body.status || "ISSUED",
            notes,
            createdBy: token.id,
        });

        // Update employee's accumulated staff deposit in user profile
        await User.findByIdAndUpdate(employee._id, {
            accumulatedStaffDeposit: newAccumulated,
            remainingLeave: Number(remainingLeave),
        });

        return NextResponse.json({
            success: true,
            message: "Salary slip issued successfully",
            salary: newSalary,
        });
    } catch (error: unknown) {
        console.error("Salary creation error:", error);
        const message = error instanceof Error ? error.message : "Failed to issue salary slip";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
