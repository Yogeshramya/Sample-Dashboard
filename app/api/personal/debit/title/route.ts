import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import DebitTitle from "@/models/DebitTitle";
import { connectDB } from "@/lib/db";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET() {
    try {
        await connectDB();
        const titles = await DebitTitle.find({ module: "PERSONAL" }).sort({ title: 1 }).lean();
        return NextResponse.json({ success: true, titles });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to fetch titles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { title } = await req.json();
        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
        }

        const newTitle = await DebitTitle.create({
            title: title.trim(),
            module: "PERSONAL",
        });

        return NextResponse.json({ success: true, title: newTitle }, { status: 201 });
    } catch (err: unknown) {
        if ((err as { code?: number }).code === 11000) {
            return NextResponse.json({ success: false, error: "Title already exists in Savings" }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: "Failed to create title" }, { status: 500 });
    }
}

