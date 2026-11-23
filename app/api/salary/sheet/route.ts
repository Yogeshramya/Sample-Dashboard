import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Salary from "@/models/Salary";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token || token.role !== "ADMINISTRATOR") {
            return NextResponse.json(
                { success: false, error: "Only administrators can access the master salary sheet" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const payPeriodParam = searchParams.get("payPeriod") || "September 2026";

        const slips = await Salary.find({ payPeriod: payPeriodParam })
            .populate("branch", "name code")
            .sort({ employeeName: 1 })
            .lean();

        // Calculate accurate aggregates
        let totalGross = 0;
        let totalLeaveDeduction = 0;
        let totalSalaryAdvance = 0;
        let totalStaffDeposit = 0;
        let totalDeductions = 0;
        let totalNetPayable = 0;

        const sheetRows = slips.map((slip) => {
            const gross = slip.totalEarnings?.full || slip.totalEarnings?.actual || 0;
            const leaveDed = slip.lop || 0;
            const advance = slip.advance || 0;
            const deposit = slip.staffDeposit || 0;
            const totDed = slip.totalDeductions || (leaveDed + advance + deposit);
            const net = slip.netSalary || (gross - totDed);

            totalGross += gross;
            totalLeaveDeduction += leaveDed;
            totalSalaryAdvance += advance;
            totalStaffDeposit += deposit;
            totalDeductions += totDed;
            totalNetPayable += net;

            return {
                _id: slip._id,
                slipId: slip.slipId,
                employeeName: slip.employeeName,
                employeeId: slip.employeeCode || "N/A",
                designation: slip.designation || "N/A",
                salaryPeriod: `${slip.cycleStartDate || "26-AUG-2026"} to ${slip.cycleEndDate || "25-SEP-2026"}`,
                monthlyGrossSalary: gross,
                totalDays: slip.workingDays || 30,
                presentDays: slip.presentDays ?? 0,
                lopDays: slip.absentDays ?? 0,
                dailySalary: slip.dailySalary || 0,
                leaveDeduction: leaveDed,
                salaryAdvance: advance,
                staffDeposit: deposit,
                totalDeduction: totDed,
                netSalaryPayable: net,
            };
        });

        // Round summary totals to 2 decimal places to guarantee accuracy
        const totals = {
            totalGross: Math.round(totalGross * 100) / 100,
            totalLeaveDeduction: Math.round(totalLeaveDeduction * 100) / 100,
            totalSalaryAdvance: Math.round(totalSalaryAdvance * 100) / 100,
            totalStaffDeposit: Math.round(totalStaffDeposit * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            totalNetPayable: Math.round(totalNetPayable * 100) / 100,
        };

        const cycleStartDate = slips[0]?.cycleStartDate || "26-AUG-2026";
        const cycleEndDate = slips[0]?.cycleEndDate || "25-SEP-2026";
        const totalDaysInCycle = slips[0]?.workingDays || 31;

        return NextResponse.json({
            success: true,
            payPeriod: payPeriodParam,
            cycleStartDate,
            cycleEndDate,
            totalDaysInCycle,
            rows: sheetRows,
            totals,
            preparedBy: slips[0]?.preparedBy || "SARANYA",
            checkedBy: slips[0]?.checkedBy || "NANDHINI",
            approvedBy: slips[0]?.approvedBy || "VIGNESH",
        });
    } catch (error: unknown) {
        console.error("Salary sheet error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate monthly salary sheet" },
            { status: 500 }
        );
    }
}
