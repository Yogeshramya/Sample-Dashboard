import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        void PersonalClient;
        void PersonalScheme;

        const account = await PersonalAccount.findById(id)
            .populate("customer")
            .populate("scheme")
            .populate("collectorId", "name phone")
            .populate("branchId", "name")
            .lean();

        if (!account) {
            return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            const accBranchStr = account.branchId && typeof account.branchId === "object"
                ? String((account.branchId as { _id?: unknown })._id)
                : String(account.branchId || "");

            if (accBranchStr !== ctx.branchId) {
                return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
            }
        }

        return NextResponse.json({ success: true, account });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const body = await req.json();

        const account = await PersonalAccount.findById(id);
        if (!account) {
            return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            if (String(account.branchId) !== ctx.branchId) {
                return NextResponse.json({ success: false, message: "Unauthorized action on account from another branch" }, { status: 403 });
            }
            delete body.branchId;
        }

        if (body.status === "ACTIVE") {
            body.approvedBy = ctx.userId;
            body.approvedAt = new Date();
        } else if (body.status === "SETTLED") {
            body.settledBy = ctx.userId;
            body.settledAt = new Date();
            body.settlementAmount = body.settlementAmount || account.maturityAmount;
        }

        const updated = await PersonalAccount.findByIdAndUpdate(id, body, { new: true });

        return NextResponse.json({ success: true, account: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
