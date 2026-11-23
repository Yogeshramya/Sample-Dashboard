import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsDraft from "@/models/SavingsDraft";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const match: { branch?: mongoose.Types.ObjectId; refunded: boolean } = {
            refunded: false,
        };

        if (ctx.branchObjectId) {
            match.branch = ctx.branchObjectId;
        }

        const result = await SavingsDraft.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalSavings" },
                },
            },
        ]);

        return NextResponse.json({
            success: true,
            total: result[0]?.total || 0,
        });

    } catch (err) {
        console.error("Total SavingsDraft error:", err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
