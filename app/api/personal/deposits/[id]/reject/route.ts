import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
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

        const rawParams = await Promise.resolve(context?.params);
        const id = rawParams?.id;

        if (!id) {
            return NextResponse.json({ success: false, error: "Deposit ID is required" }, { status: 400 });
        }
        let reason = "";
        try {
            const body = await req.json();
            reason = body.reason || "";
        } catch {
            reason = "";
        }

        const deposit = await PersonalDeposit.findById(id);
        if (!deposit) {
            return NextResponse.json({ success: false, error: "Deposit record not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(deposit.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Deposit belongs to another branch" },
                { status: 403 }
            );
        }

        if (deposit.status === "APPROVED") {
            return NextResponse.json(
                { success: false, error: "Cannot reject a deposit that has already been approved" },
                { status: 400 }
            );
        }

        deposit.status = "REJECTED";
        deposit.rejectionReason = reason || "Rejected by administrator";
        deposit.approvedBy = ctx.userId as unknown as typeof deposit.approvedBy;
        deposit.approvedAt = new Date();
        await deposit.save();

        return NextResponse.json({
            success: true,
            message: "Deposit rejected successfully",
            deposit,
        });
    } catch (error) {
        console.error("Personal deposit reject error:", error);
        return NextResponse.json({ success: false, error: "Failed to reject deposit" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(req, context);
}

