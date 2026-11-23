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

        const { id, remarks } = await req.json();

        if (!id)
            return NextResponse.json(
                { success: false, error: "CashBox ID required" },
                { status: 400 }
            );

        const cashBox = await CashBox.findById(id);
        if (!cashBox)
            return NextResponse.json(
                { success: false, error: "CashBox not found" },
                { status: 404 }
            );

        if (!ctx.isAdmin && String(cashBox.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized access to another branch's cashbox" },
                { status: 403 }
            );
        }

        cashBox.status = "REJECTED";
        cashBox.remarks = remarks || "Rejected by manager";
        cashBox.approvedBy = ctx.userId as unknown as typeof cashBox.approvedBy;
        cashBox.approvedAt = new Date();
        await cashBox.save();

        return NextResponse.json({ success: true, message: "CashBox rejected" });
    } catch (error) {
        console.error("CashBox reject error:", error);
        return NextResponse.json(
            { success: false, error: "Reject failed" },
            { status: 500 }
        );
    }
}
