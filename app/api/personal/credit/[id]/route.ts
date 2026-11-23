import { NextRequest, NextResponse } from "next/server";
import Credit from "@/models/Credit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;
        const credit = await Credit.findOne({ _id: id, module: "PERSONAL" })
            .populate({ path: "employee", select: "_id name", model: User })
            .populate({ path: "branch", select: "_id name code", model: Branch })
            .lean();

        if (!credit) {
            return NextResponse.json(
                { success: false, error: "Savings income record not found" },
                { status: 404 }
            );
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            const creditBranchStr = credit.branch && typeof credit.branch === "object"
                ? String((credit.branch as { _id?: unknown })._id)
                : String(credit.branch || "");

            if (creditBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Savings income record not found" },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json({ success: true, credit });
    } catch {
        return NextResponse.json(
            { success: false, error: "Error fetching credit" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;
        const existing = await Credit.findOne({ _id: id, module: "PERSONAL" });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Savings income record not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(existing.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on record from another branch" },
                { status: 403 }
            );
        }

        const body = await req.json();
        if (!ctx.isAdmin) {
            delete body.branch;
        }

        const updated = await Credit.findOneAndUpdate(
            { _id: id, module: "PERSONAL" },
            { $set: body },
            { new: true }
        );

        return NextResponse.json({ success: true, credit: updated });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to update savings income" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.isAdmin) {
            return NextResponse.json(
                { success: false, error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        const deleted = await Credit.findOneAndDelete({ _id: id, module: "PERSONAL" });

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Credit record not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to delete savings income" },
            { status: 500 }
        );
    }
}
