import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

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
        const { employeeId, currentPassword, newPassword, confirmPassword } = body;

        const targetId = employeeId ? String(employeeId) : String(token.id);
        const isOwnAccount = targetId === String(token.id);

        // If resetting someone else's password, caller must be an Administrator
        if (!isOwnAccount && token.role !== "ADMINISTRATOR") {
            return NextResponse.json(
                { success: false, error: "Only administrators can reset other employees' passwords" },
                { status: 403 }
            );
        }

        if (!newPassword || typeof newPassword !== "string") {
            return NextResponse.json(
                { success: false, error: "New password is required" },
                { status: 400 }
            );
        }

        if (newPassword.length < 4) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 4 characters long" },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { success: false, error: "New password and confirmation do not match" },
                { status: 400 }
            );
        }

        const user = await User.findById(targetId);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Employee account not found" },
                { status: 404 }
            );
        }

        // If the user is resetting their own password, verify their current password first
        if (isOwnAccount) {
            if (!currentPassword) {
                return NextResponse.json(
                    { success: false, error: "Current password is required to set a new password" },
                    { status: 400 }
                );
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return NextResponse.json(
                    { success: false, error: "Current password is incorrect" },
                    { status: 400 }
                );
            }
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return NextResponse.json({
            success: true,
            message: "Password has been successfully updated",
        });
    } catch (error) {
        console.error("Password reset error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to reset password. Please try again." },
            { status: 500 }
        );
    }
}
