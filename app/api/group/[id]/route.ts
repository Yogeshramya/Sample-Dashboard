import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import mongoose from "mongoose";
import Client from "@/models/Client";
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

        let group;

        if (mongoose.Types.ObjectId.isValid(id)) {
            group = await Group.findById(id)
                .populate("branch")
                .populate("createdBy")
                .populate("employee");
        } else {
            group = await Group.findOne({ groupId: id })
                .populate("branch")
                .populate("createdBy")
                .populate("employee");
        }

        if (!group) {
            return NextResponse.json(
                { error: "Group not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin) {
            const groupBranchStr = group.branch && typeof group.branch === "object"
                ? String((group.branch as { _id?: unknown })._id)
                : String(group.branch || "");
            if (groupBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { error: "Group not found" },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(group);
    } catch (error) {
        return NextResponse.json(
            { error },
            { status: 400 }
        );
    }
}

export async function PUT(
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

        const existingGroup = await Group.findById(id);
        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            if (String(existingGroup.branch) !== ctx.branchId) {
                return NextResponse.json({ error: "Unauthorized action on another branch's group" }, { status: 403 });
            }
            delete body.branch;
        }

        const updated = await Group.findOneAndUpdate(
            { _id: id },
            body,
            {
                returnDocument: 'after',
                runValidators: true,
            }
        );

        return NextResponse.json(updated);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err }, { status: 400 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        const existingGroup = await Group.findById(id);
        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(existingGroup.branch) !== ctx.branchId) {
            return NextResponse.json({ error: "Unauthorized action on another branch's group" }, { status: 403 });
        }

        /* ---------- CHECK APPROVED CLIENTS ---------- */

        const approvedClients = await Client.exists({
            group: id,
            status: "APPROVED",
        });

        if (approvedClients) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Group cannot be deleted because approved customers exist",
                },
                { status: 400 }
            );
        }

        /* ---------- DELETE GROUP ---------- */

        await Group.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Group deleted successfully",
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { success: false, error: "Delete failed" },
            { status: 500 }
        );
    }
}
