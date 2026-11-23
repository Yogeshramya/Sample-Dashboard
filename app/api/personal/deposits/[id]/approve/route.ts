import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const rawParams = await Promise.resolve(context?.params);
        const id = rawParams?.id;

        if (!id) {
            return NextResponse.json({ success: false, error: "Deposit ID is required" }, { status: 400 });
        }

        const deposit = await PersonalDeposit.findById(id);
        if (!deposit) {
            return NextResponse.json({ success: false, error: "Deposit record not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(deposit.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Deposit belongs to another branch" },
                { status: 403 }
            );
        }

        if (deposit.status === "APPROVED") {
            return NextResponse.json({ success: false, error: "Deposit is already approved" }, { status: 400 });
        }

        const account = await PersonalAccount.findById(deposit.account);
        if (!account) {
            return NextResponse.json({ success: false, error: "Associated savings account not found" }, { status: 404 });
        }

        // 1. Mark deposit as APPROVED
        deposit.status = "APPROVED";
        deposit.approvedBy = ctx.userId as unknown as typeof deposit.approvedBy;
        deposit.approvedAt = new Date();
        deposit.rejectionReason = "";
        await deposit.save();

        // 2. Credit the account upon approval
        const newPaidInstallments = (account.paidInstallments || 0) + (deposit.installmentCount || 1);
        const newTotalDeposited = (account.totalDeposited || 0) + (deposit.amount || 0);
        const isMatured = newPaidInstallments >= account.totalTargetInstallments;

        account.paidInstallments = newPaidInstallments;
        account.totalDeposited = newTotalDeposited;
        if (isMatured && account.status === "ACTIVE") {
            account.status = "MATURED";
        }
        await account.save();

        return NextResponse.json({
            success: true,
            message: "Deposit approved and credited to savings account successfully",
            deposit,
            account,
        });
    } catch (error) {
        console.error("Personal deposit approve error:", error);
        return NextResponse.json({ success: false, error: "Failed to approve deposit" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(req, context);
}

