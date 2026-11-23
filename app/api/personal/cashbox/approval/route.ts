import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CashBox from "@/models/CashBox";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const query: Record<string, unknown> = {
            module: "PERSONAL",
            status: "PENDING",
        };

        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        const records = await CashBox.find(query)
            .populate("branch", "name branchName code")
            .populate("employee", "name")
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            records,
        });
    } catch (error) {
        console.error("Personal CashBox approvals error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
