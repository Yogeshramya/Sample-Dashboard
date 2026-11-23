import Branch from "@/models/Branch";
import { connectDB } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

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
        const branch = await Branch.findById(id);
        if (!branch) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        return NextResponse.json(branch);
    } catch (error) {
        console.error("Get branch error:", error);
        return NextResponse.json({ error: "Failed to fetch branch" }, { status: 500 });
    }
}

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

        if (token.role !== "ADMINISTRATOR") {
            return NextResponse.json({ error: "Admin privilege required" }, { status: 403 });
        }

        const data = await req.json();
        const { id } = await params;

        const branch = await Branch.findByIdAndUpdate(id, data, { new: true });
        if (!branch) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        await logAudit({
            action: "UPDATED",
            module: "BRANCH",
            recordId: id,
            performedById: (token.id as string) || "ADMIN",
            performedByName: (token.name as string) || "ADMINISTRATOR",
        });

        return NextResponse.json(branch);
    } catch (error) {
        console.error("Update branch error:", error);
        return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
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

        if (token.role !== "ADMINISTRATOR") {
            return NextResponse.json({ error: "Admin privilege required" }, { status: 403 });
        }

        const { id } = await params;
        const deleted = await Branch.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        await logAudit({
            action: "DELETED",
            module: "BRANCH",
            recordId: id,
            performedById: (token.id as string) || "ADMIN",
            performedByName: (token.name as string) || "ADMINISTRATOR",
        });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Delete branch error:", error);
        return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
    }
}
