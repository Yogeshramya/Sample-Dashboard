import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Scheme from "@/models/Scheme";
import { getToken } from "next-auth/jwt";
import { logAudit } from "@/lib/audit";

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

        const allowedRoles = ["ADMINISTRATOR", "ACCOUNTS_HEAD", "MANAGER", "AREA_MANAGER"];
        if (!allowedRoles.includes(token.role as string)) {
            return NextResponse.json({ error: "Insufficient permissions to create schemes" }, { status: 403 });
        }

        const data = await req.json();
        const scheme = await Scheme.create(data);

        await logAudit({
            action: "CREATED",
            module: "SCHEME",
            recordId: String(scheme._id),
            performedById: (token.id as string) || "ADMIN",
            performedByName: (token.name as string) || "ADMINISTRATOR",
        });

        return NextResponse.json({ success: true, scheme }, { status: 201 });
    } catch (err) {
        console.error("Create scheme error:", err);
        return NextResponse.json({ success: false, error: "Failed to create scheme" }, { status: 500 });
    }
}
