import { NextRequest, NextResponse } from "next/server";
import Credit from "@/models/Credit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "branch", select: "_id name code", model: Branch },
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const credit = await Credit.findById(id).populate(populateFields);

        if (!credit) {
            return NextResponse.json({ error: "Credit not found" }, { status: 404 });
        }

        const creditBranchId =
            credit.branch && typeof credit.branch === "object" && "_id" in credit.branch
                ? String((credit.branch as { _id?: unknown })._id)
                : credit.branch
                  ? String(credit.branch)
                  : null;

        if (!ctx.isAdmin) {
            if (creditBranchId && ctx.branchId && creditBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Credit not found" }, { status: 404 });
            }
            if (!creditBranchId && ctx.userId) {
                const employeeId =
                    credit.employee && typeof credit.employee === "object" && "_id" in credit.employee
                        ? String((credit.employee as { _id?: unknown })._id)
                        : credit.employee
                          ? String(credit.employee)
                          : null;

                if (employeeId && employeeId !== ctx.userId) {
                    return NextResponse.json({ error: "Credit not found" }, { status: 404 });
                }
            }
        }

        return NextResponse.json({ success: true, credit });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const existing = await Credit.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "Credit not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const existingBranchId =
                existing.branch && typeof existing.branch === "object" && "_id" in existing.branch
                    ? String((existing.branch as { _id?: unknown })._id)
                    : existing.branch
                      ? String(existing.branch)
                      : null;

            if (existingBranchId && ctx.branchId && existingBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Unauthorized access to another branch's credit" }, { status: 403 });
            }
        }

        const data = await req.json();
        if (!ctx.isAdmin) {
            delete data.branch;
        }

        await Credit.findByIdAndUpdate(id, data, { returnDocument: 'after' });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const existing = await Credit.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "Credit not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const existingBranchId =
                existing.branch && typeof existing.branch === "object" && "_id" in existing.branch
                    ? String((existing.branch as { _id?: unknown })._id)
                    : existing.branch
                      ? String(existing.branch)
                      : null;

            if (existingBranchId && ctx.branchId && existingBranchId !== ctx.branchId) {
                return NextResponse.json({ error: "Unauthorized access to another branch's credit" }, { status: 403 });
            }
        }

        await Credit.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
