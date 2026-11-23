import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const bill = await Bill.findById(id);

        if (!bill || bill.status !== "APPROVAL") {
            return NextResponse.json(
                { success: false, error: "Invalid bill state" },
                { status: 400 }
            );
        }

        if (!ctx.isAdmin && String(bill.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized access to another branch's bill" },
                { status: 403 }
            );
        }

        bill.status = "REJECTED";
        bill.approvedBy = ctx.userId as unknown as typeof bill.approvedBy;
        bill.approvedAt = new Date();

        await bill.save();

        return NextResponse.json({
            success: true,
            message: "Pre-close rejected",
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
