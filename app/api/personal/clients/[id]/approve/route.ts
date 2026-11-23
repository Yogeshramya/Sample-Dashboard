import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;

        const client = await PersonalClient.findById(id);
        if (!client) {
            return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(client.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on customer from another branch" },
                { status: 403 }
            );
        }

        client.status = "APPROVED";
        client.approvedBy = ctx.userId as unknown as typeof client.approvedBy;
        client.approvedAt = new Date();
        await client.save();

        return NextResponse.json({ success: true, client });
    } catch (error) {
        console.error("Personal client approve error:", error);
        return NextResponse.json({ success: false, error: "Failed to approve customer" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(req, context);
}

