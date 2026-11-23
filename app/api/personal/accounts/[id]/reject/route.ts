import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
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

        const { id } = await context.params;
        let reason = "Rejected by administrator";
        try {
            const body = await req.json();
            if (body.reason) reason = body.reason;
        } catch {
            // body is optional
        }

        const account = await PersonalAccount.findById(id);
        if (!account) {
            return NextResponse.json({ success: false, error: "Savings account not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(account.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on account from another branch" },
                { status: 403 }
            );
        }

        account.status = "REJECTED";
        account.rejectedBy = ctx.userId as unknown as typeof account.rejectedBy;
        account.rejectedAt = new Date();
        account.rejectedReason = reason;
        await account.save();

        return NextResponse.json({ success: true, account });
    } catch (error) {
        console.error("Personal account reject error:", error);
        return NextResponse.json({ success: false, error: "Failed to reject account" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(req, context);
}

