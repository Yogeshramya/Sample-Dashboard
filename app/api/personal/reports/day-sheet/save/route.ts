import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import DaySheetDraft from "@/models/DaySheetDraft";
import { getTodayIST } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json({ success: false, error: "Branch not assigned" }, { status: 400 });
        }

        const { date, denomination, branchId: bodyBranchId } = await req.json();

        if (!date || !Array.isArray(denomination)) {
            return NextResponse.json(
                { success: false, error: "Invalid payload" },
                { status: 400 }
            );
        }

        const targetBranch = (ctx.isAdmin && bodyBranchId && mongoose.Types.ObjectId.isValid(bodyBranchId))
            ? new mongoose.Types.ObjectId(bodyBranchId)
            : ctx.branchObjectId;

        if (!targetBranch) {
            return NextResponse.json({ success: false, error: "Target branch not found" }, { status: 400 });
        }

        // Permission check: Day sheet draft can only be saved on the current date, except by administrators
        const todayIST = getTodayIST();
        if (date !== todayIST && !ctx.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Day sheet draft can only be saved on the current date. Only administrators can save previous dates.",
                },
                { status: 403 }
            );
        }

        await DaySheetDraft.findOneAndUpdate(
            { date, branch: targetBranch, module: "PERSONAL" },
            {
                date,
                module: "PERSONAL",
                branch: targetBranch,
                employee: ctx.userId,
                denomination,
            },
            {
                upsert: true,
                returnDocument: "after",
            }
        );

        return NextResponse.json({
            success: true,
            message: "Day sheet draft saved successfully",
        });
    } catch (error) {
        console.error("Personal Day Sheet Draft Save Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save draft" },
            { status: 500 }
        );
    }
}
