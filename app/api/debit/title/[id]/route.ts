import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DebitTitle from "@/models/DebitTitle";
import { getToken } from "next-auth/jwt";

export async function PUT(
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

        const role = token.role as string;
        if (role !== "ADMINISTRATOR" && role !== "ACCOUNTS_HEAD" && role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden: Management permissions required" }, { status: 403 });
        }

        const body = await req.json();
        const { id } = await params;

        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
            return NextResponse.json({ success: false, error: "Valid title is required" }, { status: 400 });
        }

        const updated = await DebitTitle.findByIdAndUpdate(
            id,
            { title: body.title.trim() },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ success: false, error: "Debit title not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, updated });
    } catch (error) {
        console.error("Error updating debit title:", error);
        return NextResponse.json({ success: false, error: "Failed to update title" }, { status: 500 });
    }
}

export async function DELETE(
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

        const role = token.role as string;
        if (role !== "ADMINISTRATOR" && role !== "ACCOUNTS_HEAD" && role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden: Management permissions required" }, { status: 403 });
        }

        const { id } = await params;
        const deleted = await DebitTitle.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ success: false, error: "Debit title not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting debit title:", error);
        return NextResponse.json({ success: false, error: "Failed to delete title" }, { status: 500 });
    }
}
