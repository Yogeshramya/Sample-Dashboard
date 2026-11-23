import { NextRequest, NextResponse } from "next/server";
import Remittance from "@/models/Remittance";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import mongoose from "mongoose";

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
        const { action } = await req.json(); // "APPROVE" | "REJECT"

        if (!["APPROVE", "REJECT"].includes(action)) {
            return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
        }

        const existingRemittance = await Remittance.findById(id);
        if (!existingRemittance) {
            return NextResponse.json({ success: false, error: "Remittance record not found" }, { status: 404 });
        }

        // Branch authorization check: non-admin can only approve/reject if toBranch (destination) or fromBranch matches their branch
        if (!ctx.isAdmin) {
            const toBranchStr = String(existingRemittance.toBranch);
            const fromBranchStr = String(existingRemittance.fromBranch);
            if (toBranchStr !== ctx.branchId && fromBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized: Remittance does not involve your branch" },
                    { status: 403 }
                );
            }
        }

        const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

        existingRemittance.status = status;
        if (ctx.userId) {
            existingRemittance.approvedBy = new mongoose.Types.ObjectId(ctx.userId);
        }
        await existingRemittance.save();

        const remittance = await Remittance.findById(id)
            .populate("fromBranch", "name code")
            .populate("toBranch", "name code")
            .populate("requestedBy", "name")
            .populate("approvedBy", "name");

        return NextResponse.json({ success: true, remittance });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to process remittance action" }, { status: 500 });
    }
}
