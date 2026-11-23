import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
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

        const branches = await Branch.find().lean();
        return NextResponse.json({ branches });
    } catch (error) {
        console.error("List branches error:", error);
        return NextResponse.json({ error: "Failed to list branches" }, { status: 500 });
    }
}
