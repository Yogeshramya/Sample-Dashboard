import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import CreditTitle from "@/models/CreditTitle";
import { connectDB } from "@/lib/db";

const secret = process.env.NEXTAUTH_SECRET!;

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });

        if (!token || token.role !== "ADMINISTRATOR") {
            return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
        }

        const { id } = await context.params;
        const deleted = await CreditTitle.findOneAndDelete({ _id: id, module: "PERSONAL" });

        if (!deleted) {
            return NextResponse.json({ success: false, error: "Title not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Title deleted" });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to delete title" }, { status: 500 });
    }
}

