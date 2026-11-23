import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { remarks } = await req.json();
        const { id } = await params;

        const loan = await Loan.findById(id);
        if (!loan) {
            return NextResponse.json({ error: "Loan not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(loan.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's loan" },
                { status: 403 }
            );
        }

        loan.status = "REJECTED";
        loan.approvalRemarks = remarks;
        loan.rejectedAt = new Date();
        loan.approvedBy = ctx.userId as unknown as typeof loan.approvedBy;
        await loan.save();

        return NextResponse.json(loan);
    } catch (err) {
        console.error("Reject loan error:", err);
        return NextResponse.json({ error: "Failed to reject loan" }, { status: 500 });
    }
}
