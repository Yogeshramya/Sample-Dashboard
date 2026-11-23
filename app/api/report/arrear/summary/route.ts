import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";
import { syncArrearLoans } from "@/lib/arrear";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token)
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        try {
            await syncArrearLoans(branchId ? String(branchId) : undefined);
        } catch (syncErr) {
            console.error("Arrear sync warning:", syncErr);
        }

        const matchStage: Record<string, unknown> = {
            status: "OPEN",
        };

        if (branchId) {
            matchStage.branch = new mongoose.Types.ObjectId(String(branchId));
        }

        const result = await ArrearLoan.aggregate([
            {
                $match: matchStage,
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    principal: { $sum: "$principal" },
                    interest: { $sum: "$interest" },
                    savings: { $sum: "$savings" },
                    total: { $sum: "$totalAmount" },
                    remaining: { $sum: "$remainingAmount" },
                },
            },
        ]);

        return NextResponse.json({
            success: true,
            summary: result[0] || {
                count: 0,
                principal: 0,
                interest: 0,
                savings: 0,
                total: 0,
                remaining: 0,
            },
        });
    } catch (err) {
        console.error("Arrear summary error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to load arrear summary" },
            { status: 500 }
        );
    }
}
