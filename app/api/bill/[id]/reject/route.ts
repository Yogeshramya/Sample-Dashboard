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

        if (!bill) {
            return NextResponse.json(
                { error: "Bill not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(bill.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's bill" },
                { status: 403 }
            );
        }

        if (bill.status !== "PENDING") {
            return NextResponse.json(
                { error: "Bill already processed" },
                { status: 400 }
            );
        }

        bill.status = "REJECTED";
        bill.rejectedBy = ctx.userId as unknown as typeof bill.rejectedBy;
        bill.rejectedAt = new Date();

        await bill.save();

        return NextResponse.json({
            success: true,
            message: "Bill rejected successfully",
        });
    } catch (error) {
        console.error("Bill reject error:", error);
        return NextResponse.json(
            { error: "Failed to reject bill" },
            { status: 500 }
        );
    }
}
