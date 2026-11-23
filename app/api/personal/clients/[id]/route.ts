import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        const client = await PersonalClient.findById(id).populate("branchId", "name").lean();
        if (!client) {
            return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            const clientBranchStr = client.branchId && typeof client.branchId === "object"
                ? String((client.branchId as { _id?: unknown })._id)
                : String(client.branchId || "");

            if (clientBranchStr !== ctx.branchId) {
                return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
            }
        }

        return NextResponse.json({ success: true, client });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const body = await req.json();

        const client = await PersonalClient.findById(id);
        if (!client) {
            return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            if (String(client.branchId) !== ctx.branchId) {
                return NextResponse.json({ success: false, message: "Unauthorized action on client from another branch" }, { status: 403 });
            }
            // Prevent changing client's branch
            delete body.branchId;
        }

        const updated = await PersonalClient.findByIdAndUpdate(id, body, { new: true });

        return NextResponse.json({ success: true, client: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const client = await PersonalClient.findById(id);
        if (!client) {
            return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin && String(client.branchId) !== ctx.branchId) {
            return NextResponse.json({ success: false, message: "Unauthorized action on client from another branch" }, { status: 403 });
        }

        await PersonalClient.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Client deleted" });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
