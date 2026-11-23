import Branch from "@/models/Branch";
import { connectDB } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

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

        const branches = await Branch.find().sort({ createdAt: -1 });
        return NextResponse.json(branches);
    } catch (error) {
        console.error("Fetch branches error:", error);
        return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
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

        if (token.role !== "ADMINISTRATOR") {
            return NextResponse.json({ error: "Admin privilege required" }, { status: 403 });
        }

        const body = await req.json();
        const branch = await Branch.create(body);

        await logAudit({
            action: "CREATED",
            module: "BRANCH",
            recordId: String(branch._id),
            performedById: (token.id as string) || "ADMIN",
            performedByName: (token.name as string) || "ADMINISTRATOR",
        });

        return NextResponse.json(branch, { status: 201 });
    } catch (error) {
        console.error("Create branch error:", error);
        return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
    }
}
