import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void PersonalAccount;
        void PersonalClient;
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const branchParam = searchParams.get("branchId") || searchParams.get("branch");

        const query: Record<string, unknown> = {
            status: { $nin: ["APPROVED", "REJECTED"] },
        };

        if (!ctx.isAdmin) {
            query.branchId = ctx.branchObjectId;
        } else if (branchParam && branchParam !== "ALL") {
            query.branchId = ctx.branchObjectId;
        } else if (!branchParam && ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        const deposits = await PersonalDeposit.find(query)
            .populate("branchId", "name")
            .populate({
                path: "account",
                select: "accountNumber frequency installmentAmount totalDeposited maturityAmount scheme",
                populate: { path: "scheme", select: "name" },
            })
            .populate("customer", "clientId fullName mobile")
            .populate("collectedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const totalAmount = deposits.reduce((sum: number, d: { amount?: number }) => sum + (d.amount || 0), 0);

        return NextResponse.json({
            success: true,
            count: deposits.length,
            totalAmount,
            deposits,
        });
    } catch (error) {
        console.error("Personal deposits pending error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch pending deposits" }, { status: 500 });
    }
}

