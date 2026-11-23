import { connectDB } from "@/lib/db";
import CashBox from "@/models/CashBox";
import { NextRequest, NextResponse } from "next/server";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await req.json();

        const existing = await CashBox.findOne({ _id: id, module: "PERSONAL" });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Cashbox not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(existing.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Record belongs to another branch" },
                { status: 403 }
            );
        }

        existing.status = "APPROVED";
        existing.approvedBy = ctx.userId as unknown as typeof existing.approvedBy;
        existing.approvedAt = new Date();
        await existing.save();

        return NextResponse.json({ success: true, cashBox: existing });
    } catch (error) {
        console.error("Personal CashBox approve error:", error);
        return NextResponse.json(
            { success: false, error: "Approval failed" },
            { status: 500 }
        );
    }
}
