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
        let reason = "Rejected by administrator";
        try {
            const body = await req.json();
            if (body.reason) reason = body.reason;
        } catch {
            // body is optional
        }

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

        client.status = "REJECTED";
        client.rejectedBy = ctx.userId as unknown as typeof client.rejectedBy;
        client.rejectedAt = new Date();
        client.rejectedReason = reason;
        await client.save();

        return NextResponse.json({ success: true, client });
    } catch (error) {
        console.error("Personal client reject error:", error);
        return NextResponse.json({ success: false, error: "Failed to reject customer" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(req, context);
}

