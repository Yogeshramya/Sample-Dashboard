import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import Group from "@/models/Group";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        const targetUser = await User.findById(id);
        if (!targetUser) {
            return NextResponse.json({ message: "Employee not found" }, { status: 404 });
        }

        if (targetUser.role === "ADMINISTRATOR") {
            return NextResponse.json(
                { message: "Cannot delete Administrator accounts" },
                { status: 403 }
            );
        }

        if (!ctx.isAdmin && String(targetUser.branch) !== ctx.branchId) {
            return NextResponse.json(
                { message: "Unauthorized access to another branch's employee" },
                { status: 403 }
            );
        }

        /* CHECK GROUP ASSIGNMENT */

        const group = await Group.findOne({ employee: id });

        if (group) {
            return NextResponse.json(
                { message: "Employee has assigned groups. Remove them first." },
                { status: 400 }
            );
        }

        /* DELETE USER */

        await User.findByIdAndDelete(id);

        return NextResponse.json({
            message: "Employee deleted",
        });
    } catch (error) {
        console.error("Delete employee error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
