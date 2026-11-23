import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import PersonalClient from "@/models/PersonalClient";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

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

        // 1. Try finding in MFI Client
        const client = await Client.findById(id);
        if (client) {
            if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
                return NextResponse.json(
                    { error: "Unauthorized action on client from another branch" },
                    { status: 403 }
                );
            }

            await Client.deleteOne({ _id: client._id });
            return NextResponse.json({
                success: true,
                message: "Client rejected and deleted successfully",
            });
        }

        // 2. Try finding in PersonalClient
        const pClient = await PersonalClient.findById(id);
        if (pClient) {
            if (!ctx.isAdmin && String(pClient.branchId) !== ctx.branchId) {
                return NextResponse.json(
                    { error: "Unauthorized action on customer from another branch" },
                    { status: 403 }
                );
            }

            pClient.status = "REJECTED";
            pClient.rejectedAt = new Date();
            pClient.rejectedBy = ctx.userId as unknown as typeof pClient.rejectedBy;
            pClient.rejectedReason = "Rejected during review";
            await pClient.save();

            return NextResponse.json({
                success: true,
                message: "Customer rejected successfully",
            });
        }

        return NextResponse.json(
            { error: "Client not found" },
            { status: 404 }
        );
    } catch (error) {
        console.error("Client delete error:", error);
        return NextResponse.json(
            { error: "Failed to reject client" },
            { status: 500 }
        );
    }
}
