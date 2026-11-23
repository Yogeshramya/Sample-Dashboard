import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Scheme from "@/models/Scheme";
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

        const data = await Scheme.find().sort({ schemeId: 1 }).lean();
        return NextResponse.json(data);
    } catch (error) {
        console.error("List schemes error:", error);
        return NextResponse.json({ error: "Failed to list schemes" }, { status: 500 });
    }
}
