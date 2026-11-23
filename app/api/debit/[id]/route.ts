import { NextRequest, NextResponse } from "next/server";
import Debit from "@/models/Debit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "branch", select: "_id name code", model: Branch },
];

// GET single debit
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const debit = await Debit.findById(id).populate(populateFields);

        if (!debit) {
            return NextResponse.json({ error: "Debit not found" }, { status: 404 });
        }

        const debitBranchId =
            debit.branch && typeof debit.branch === "object" && "_id" in debit.branch
                ? String((debit.branch as { _id?: unknown })._id)
                : debit.branch
                  ? String(debit.branch)
                  : null;

        if (!ctx.isAdmin) {
            if (debitBranchId && ctx.branchId && debitBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Debit not found" }, { status: 404 });
            }
            if (!debitBranchId && ctx.userId) {
                const employeeId =
                    debit.employee && typeof debit.employee === "object" && "_id" in debit.employee
                        ? String((debit.employee as { _id?: unknown })._id)
                        : debit.employee
                          ? String(debit.employee)
                          : null;

                if (employeeId && employeeId !== ctx.userId) {
                    return NextResponse.json({ error: "Debit not found" }, { status: 404 });
                }
            }
        }

        return NextResponse.json({ success: true, debit });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

// UPDATE debit
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const existing = await Debit.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "Debit not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const existingBranchId =
                existing.branch && typeof existing.branch === "object" && "_id" in existing.branch
                    ? String((existing.branch as { _id?: unknown })._id)
                    : existing.branch
                      ? String(existing.branch)
                      : null;

            if (existingBranchId && ctx.branchId && existingBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Unauthorized access to another branch's debit" }, { status: 403 });
            }
        }

        const data = await req.json();
        if (!ctx.isAdmin) {
            delete data.branch;
        }

        await Debit.findByIdAndUpdate(id, data, { returnDocument: 'after' });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

// DELETE debit
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const existing = await Debit.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "Debit not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const existingBranchId =
                existing.branch && typeof existing.branch === "object" && "_id" in existing.branch
                    ? String((existing.branch as { _id?: unknown })._id)
                    : existing.branch
                      ? String(existing.branch)
                      : null;

            if (existingBranchId && ctx.branchId && existingBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Unauthorized access to another branch's debit" }, { status: 403 });
            }
        }

        await Debit.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
