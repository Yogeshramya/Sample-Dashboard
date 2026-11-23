import { connectDB } from "@/lib/db";
import CashBox from "@/models/CashBox";
import { NextRequest, NextResponse } from "next/server";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const query: Record<string, unknown> = {
            status: "APPROVED",
            module: { $ne: "PERSONAL" },
        };

        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        const cashboxes = await CashBox.find(query)
            .sort({ date: -1 })   // latest first
            .limit(5)
            .lean();

        return NextResponse.json({
            success: true,
            cashboxes,
        });
    } catch (error) {
        console.error("Approved cashbox fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
