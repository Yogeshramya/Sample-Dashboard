import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import PersonalClient from "@/models/PersonalClient";
import Credit from "@/models/Credit";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

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

        const existingClient = await Client.findById(id);
        if (!existingClient) {
            // Check PersonalClient fallback
            const pClient = await PersonalClient.findById(id);
            if (pClient) {
                if (!ctx.isAdmin && String(pClient.branchId) !== ctx.branchId) {
                    return NextResponse.json(
                        { success: false, error: "Unauthorized action on customer from another branch" },
                        { status: 403 }
                    );
                }

                pClient.status = "APPROVED";
                pClient.approvedAt = new Date();
                pClient.approvedBy = ctx.userId as unknown as typeof pClient.approvedBy;
                await pClient.save();

                return NextResponse.json({
                    success: true,
                    message: "Customer approved successfully",
                    client: pClient,
                });
            }

            return NextResponse.json(
                { success: false, error: "Client not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(existingClient.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on client from another branch" },
                { status: 403 }
            );
        }

        // Approve client
        existingClient.status = "APPROVED";
        existingClient.approvedAt = new Date();
        existingClient.approvedBy = ctx.userId as unknown as typeof existingClient.approvedBy;
        await existingClient.save();

        // Create Admission Fee Credit (₹150)
        await Credit.create({
            date: new Date(),
            module: "MFI",
            title: "Admission Fee",
            details: `Admission fee for ${existingClient.name}`,
            amount: 150,
            mode: "Cash",
            status: "APPROVED",
            approvedBy: ctx.userId,
            approvedAt: new Date(),
            branch: existingClient.branch || ctx.branchObjectId,
            employee: existingClient.employee || null,
        });

        return NextResponse.json({
            success: true,
            message: "Client approved and admission fee credited",
            client: existingClient,
        });
    } catch (error) {
        console.error("Client Approval Error:", error);
        return NextResponse.json(
            { success: false, error: "Client approval failed" },
            { status: 500 }
        );
    }
}
