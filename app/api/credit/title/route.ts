import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CreditTitle from "@/models/CreditTitle";
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

        const titles = await CreditTitle.find().sort({ title: 1 }).lean();
        return NextResponse.json({ success: true, titles });
    } catch (error) {
        console.error("Error fetching credit titles:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch titles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
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
        if (role !== "ADMINISTRATOR" && role !== "ACCOUNTS_HEAD" && role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden: Management permissions required" }, { status: 403 });
        }

        const body = await req.json();

        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
            return NextResponse.json({ success: false, error: "Valid title is required" }, { status: 400 });
        }

        const newTitle = await CreditTitle.create({ title: body.title.trim() });
        return NextResponse.json({ success: true, title: newTitle }, { status: 201 });
    } catch (error) {
        console.error("Error creating credit title:", error);
        return NextResponse.json({ success: false, error: "Failed to add title" }, { status: 500 });
    }
}
