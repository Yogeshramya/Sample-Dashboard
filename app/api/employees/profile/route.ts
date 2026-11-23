import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const requestedId = searchParams.get("id");

        // Allow fetching requested employee if user is ADMINISTRATOR or AREA_MANAGER, or if requesting own ID
        let targetId = String(token.id);
        if (requestedId && requestedId !== targetId) {
            if (token.role === "ADMINISTRATOR" || token.role === "ACCOUNTS_HEAD" || token.role === "AREA_MANAGER") {
                targetId = requestedId;
            } else {
                return NextResponse.json(
                    { success: false, error: "Access denied to other employee profiles" },
                    { status: 403 }
                );
            }
        }

        const employee = await User.findById(targetId)
            .select("-password")
            .populate({ path: "branch", select: "name code", model: Branch })
            .populate({ path: "branches", select: "name code", model: Branch })
            .lean();

        if (!employee) {
            return NextResponse.json(
                { success: false, error: "Employee not found" },
                { status: 404 }
            );
        }

        const isOwnProfile = String(token.id) === String(employee._id);

        return NextResponse.json({
            success: true,
            employee,
            isOwnProfile,
            canAdminReset: token.role === "ADMINISTRATOR",
        });
    } catch (error) {
        console.error("Employee profile fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load employee profile" },
            { status: 500 }
        );
    }
}
