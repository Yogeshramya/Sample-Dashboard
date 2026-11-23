import { connectDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import { getToken } from "next-auth/jwt";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const employee = await User.findById(id)
            .select("-password -plainPassword")
            .populate("branch", "name code")
            .lean();

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        return NextResponse.json(employee);
    } catch (error) {
        console.error("Get employee error:", error);
        return NextResponse.json({ error: "Failed to fetch employee details" }, { status: 500 });
    }
}
