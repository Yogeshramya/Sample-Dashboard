import { NextRequest, NextResponse } from "next/server";
import Debit from "@/models/Debit";
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
        const debit = await Debit.findOne({ _id: id, module: "PERSONAL" })
            .populate({ path: "employee", select: "_id name", model: User })
            .populate({ path: "branch", select: "_id name code", model: Branch })
            .lean();

        if (!debit) {
            return NextResponse.json(
                { success: false, error: "Savings debit record not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin) {
            const debitBranchStr = debit.branch && typeof debit.branch === "object"
                ? String((debit.branch as { _id?: unknown })._id)
                : String(debit.branch || "");

            if (debitBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Savings debit record not found" },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json({ success: true, debit });
    } catch {
        return NextResponse.json(
            { success: false, error: "Error fetching debit" },
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
        const existing = await Debit.findOne({ _id: id, module: "PERSONAL" });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Savings debit record not found" },
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

        const updated = await Debit.findOneAndUpdate(
            { _id: id, module: "PERSONAL" },
            { $set: body },
            { new: true }
        );

        return NextResponse.json({ success: true, debit: updated });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to update savings debit" },
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
        const deleted = await Debit.findOneAndDelete({ _id: id, module: "PERSONAL" });

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Debit record not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to delete savings debit" },
            { status: 500 }
        );
    }
}
