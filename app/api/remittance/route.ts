import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Remittance from "@/models/Remittance";
import User from "@/models/User";
import Branch from "@/models/Branch";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "fromBranch", select: "name code", model: Branch },
    { path: "toBranch", select: "name code", model: Branch },
    { path: "requestedBy", select: "name", model: User },
];

// POST: Create a new remittance request (PENDING status)
export async function POST(req: Request) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();

        const { date, fromBranch, toBranch, amount, mode, details } = body;

        const effectiveFromBranch = ctx.isAdmin
            ? (fromBranch || ctx.branchId)
            : ctx.branchId;

        if (!effectiveFromBranch || !toBranch || !amount || !details) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (String(effectiveFromBranch) === String(toBranch)) {
            return NextResponse.json(
                { success: false, error: "Source and destination branch cannot be the same" },
                { status: 400 }
            );
        }

        const remittance = await Remittance.create({
            date: date ? new Date(date) : new Date(),
            fromBranch: effectiveFromBranch,
            toBranch,
            amount: Number(amount),
            mode: mode || "Cash",
            details,
            status: "PENDING",
            remittanceType: "INTER_BRANCH",
            fromModule: "MFI",
            toModule: "MFI",
            requestedBy: ctx.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined,
        });

        return NextResponse.json({
            success: true,
            message: "Remittance request submitted successfully",
            remittance,
        });
    } catch (error) {
        console.error("Error creating remittance request:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// GET: Filter remittances by status, branchId, etc.
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const query: Record<string, unknown> = {
            $or: [
                { fromModule: { $ne: "PERSONAL" } },
                { toModule: { $ne: "PERSONAL" } },
            ],
        };

        if (ctx.branchObjectId) {
            query.$and = [
                {
                    $or: [
                        { fromBranch: ctx.branchObjectId },
                        { toBranch: ctx.branchObjectId },
                    ],
                },
            ];
        }

        if (status && status !== "ALL") {
            query.status = status;
        }

        const remittances = await Remittance.find(query)
            .populate(populateFields)
            .sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            remittances,
        });
    } catch (error) {
        console.error("Error fetching remittances:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
