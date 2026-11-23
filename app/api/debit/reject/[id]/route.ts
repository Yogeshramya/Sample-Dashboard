import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Debit from "@/models/Debit";
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
        const { remarks } = await req.json();

        if (!remarks)
            return NextResponse.json({ error: "Remarks required" }, { status: 400 });

        const existing = await Debit.findById(id);
        if (!existing)
            return NextResponse.json({ error: "Debit not found" }, { status: 404 });

        if (!ctx.isAdmin && String(existing.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's record" },
                { status: 403 }
            );
        }

        existing.status = "REJECTED";
        existing.approvedBy = ctx.userId as unknown as typeof existing.approvedBy;
        existing.approvedAt = new Date();
        existing.remarks = remarks;
        await existing.save();

        return NextResponse.json({ success: true, debit: existing });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
    }
}
