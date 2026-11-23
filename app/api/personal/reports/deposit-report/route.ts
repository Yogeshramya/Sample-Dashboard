import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import User from "@/models/User";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void PersonalAccount;
        void PersonalClient;
        void User;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json({ success: false, error: "Please select a branch to view deposit report" }, { status: 400 });
        }

        const branchId = ctx.branchObjectId;

        const { searchParams } = new URL(req.url);
        let from = searchParams.get("from");
        let to = searchParams.get("to");
        const collectorId = searchParams.get("collectorId");
        const method = searchParams.get("method");
        const status = searchParams.get("status");

        if (ctx.isTeller) {
            const today = getTodayIST();
            from = today;
            to = today;
        }

        const query: Record<string, unknown> = {
            branchId,
        };

        if (status && status !== "ALL") {
            if (status === "APPROVED") {
                query.status = { $in: ["APPROVED", null] };
            } else {
                query.status = status;
            }
        }

        if (from || to) {
            query.depositDate = {};
            if (from) (query.depositDate as Record<string, Date>).$gte = parseISTDate(from, false);
            if (to) (query.depositDate as Record<string, Date>).$lte = parseISTDate(to, true);
        }

        if (collectorId && collectorId !== "ALL") {
            query.collectedBy = collectorId;
        }

        if (method && method !== "ALL") {
            query.paymentMethod = method;
        }

        const deposits = await PersonalDeposit.find(query)
            .populate("account", "accountNumber frequency installmentAmount totalDeposited maturityAmount")
            .populate("customer", "clientId fullName mobile")
            .populate("collectedBy", "name")
            .sort({ depositDate: -1, createdAt: -1 })
            .lean();

        const totalAmount = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        const approvedDeposits = deposits.filter((d) => d.status === "APPROVED" || !d.status);
        const pendingDeposits = deposits.filter((d) => d.status === "PENDING");
        const rejectedDeposits = deposits.filter((d) => d.status === "REJECTED");

        const approvedAmount = approvedDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        const pendingAmount = pendingDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        const rejectedAmount = rejectedDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

        const cashAmount = deposits
            .filter((d) => d.paymentMethod === "CASH")
            .reduce((sum, d) => sum + (d.amount || 0), 0);
        const onlineAmount = totalAmount - cashAmount;

        return NextResponse.json({
            success: true,
            deposits,
            summary: {
                totalCount: deposits.length,
                totalAmount,
                approvedCount: approvedDeposits.length,
                approvedAmount,
                pendingCount: pendingDeposits.length,
                pendingAmount,
                rejectedCount: rejectedDeposits.length,
                rejectedAmount,
                cashAmount,
                onlineAmount,
            },
        });
    } catch (error) {
        console.error("Personal deposit report error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate personal deposit report" },
            { status: 500 }
        );
    }
}
