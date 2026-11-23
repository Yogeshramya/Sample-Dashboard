import { NextRequest, NextResponse } from "next/server";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = token.role as string;
        if (role !== "ADMINISTRATOR" && role !== "ACCOUNTS_HEAD") {
            return NextResponse.json({ error: "Access denied: Admin or Accounts Head required" }, { status: 403 });
        }

        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200);
        return NextResponse.json({ logs });
    } catch (error) {
        console.error("Fetch audit logs error:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
