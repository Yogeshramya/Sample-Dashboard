import { NextRequest, NextResponse } from "next/server";
import Credit from "@/models/Credit";
import { connectDB } from "@/lib/db";
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
        const existing = await Credit.findOne({ _id: id, module: "PERSONAL" });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(existing.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on record from another branch" },
                { status: 403 }
            );
        }

        existing.status = "REJECTED";
        existing.approvedBy = ctx.userId as unknown as typeof existing.approvedBy;
        existing.approvedAt = new Date();
        await existing.save();

        return NextResponse.json({ success: true, credit: existing });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to reject" }, { status: 500 });
    }
}
