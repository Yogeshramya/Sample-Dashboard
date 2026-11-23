import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

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

        const body = await req.json();
        const {
            employeeId,
            employeeCode,
            fatherName,
            age,
            dob,
            designation,
            department,
            phone,
            address,
            joiningDate,
            bankName,
            bankAccountNo,
            panNo,
            pfNo,
            esiNo,
            basicSalary,
            hra,
            da,
            travellingAllowance,
            accumulatedStaffDeposit,
            remainingLeave,
        } = body;

        let targetId = String(token.id);
        if (employeeId) {
            if (token.role === "ADMINISTRATOR") {
                targetId = employeeId;
            } else if (String(token.id) !== employeeId) {
                return NextResponse.json(
                    { success: false, error: "Only administrators can update other employee records" },
                    { status: 403 }
                );
            }
        }

        const updateData: Record<string, unknown> = {};
        if (employeeCode !== undefined) updateData.employeeId = employeeCode;
        if (fatherName !== undefined) updateData.fatherName = fatherName;
        if (age !== undefined) updateData.age = Number(age) || undefined;
        if (dob !== undefined) updateData.dob = dob;
        if (designation !== undefined) updateData.designation = designation;
        if (department !== undefined) updateData.department = department;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankAccountNo !== undefined) updateData.bankAccountNo = bankAccountNo;
        if (panNo !== undefined) updateData.panNo = panNo;
        if (pfNo !== undefined) updateData.pfNo = pfNo;
        if (esiNo !== undefined) updateData.esiNo = esiNo;
        if (basicSalary !== undefined) updateData.basicSalary = Number(basicSalary) || 0;
        if (hra !== undefined) updateData.hra = Number(hra) || 0;
        if (da !== undefined) updateData.da = Number(da) || 0;
        if (travellingAllowance !== undefined) updateData.travellingAllowance = Number(travellingAllowance) || 0;
        if (accumulatedStaffDeposit !== undefined) updateData.accumulatedStaffDeposit = Number(accumulatedStaffDeposit) || 0;
        if (remainingLeave !== undefined) updateData.remainingLeave = Number(remainingLeave) || 0;

        const updated = await User.findByIdAndUpdate(targetId, updateData, { new: true }).select("-password");

        return NextResponse.json({
            success: true,
            message: "Employee HR details updated successfully",
            employee: updated,
        });
    } catch (error: unknown) {
        console.error("Employee update error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update employee details" },
            { status: 500 }
        );
    }
}
