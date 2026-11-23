import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();
        const depositIds: string[] = Array.isArray(body.depositIds) ? body.depositIds : [];

        if (depositIds.length === 0) {
            return NextResponse.json({ success: false, error: "No deposits selected for approval" }, { status: 400 });
        }

        const query: Record<string, unknown> = {
            _id: { $in: depositIds },
            status: { $nin: ["APPROVED", "REJECTED"] },
        };

        if (!ctx.isAdmin && ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        const deposits = await PersonalDeposit.find(query);

        let approvedCount = 0;
        for (const deposit of deposits) {
            const account = await PersonalAccount.findById(deposit.account);
            if (!account) continue;

            deposit.status = "APPROVED";
            deposit.approvedBy = ctx.userId as unknown as typeof deposit.approvedBy;
            deposit.approvedAt = new Date();
            deposit.rejectionReason = "";
            await deposit.save();

            const newPaidInstallments = (account.paidInstallments || 0) + (deposit.installmentCount || 1);
            const newTotalDeposited = (account.totalDeposited || 0) + (deposit.amount || 0);
            const isMatured = newPaidInstallments >= account.totalTargetInstallments;

            account.paidInstallments = newPaidInstallments;
            account.totalDeposited = newTotalDeposited;
            if (isMatured && account.status === "ACTIVE") {
                account.status = "MATURED";
            }
            await account.save();
            approvedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully approved ${approvedCount} deposit(s)`,
            approvedCount,
        });
    } catch (error) {
        console.error("Personal deposits bulk approve error:", error);
        return NextResponse.json({ success: false, error: "Failed to bulk approve deposits" }, { status: 500 });
    }
}

