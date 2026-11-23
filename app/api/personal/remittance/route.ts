import { NextRequest, NextResponse } from "next/server";
import Remittance from "@/models/Remittance";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
import User from "@/models/User";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void Branch;
        void User;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "APPROVED";
        const type = searchParams.get("type"); // "INTER_BRANCH" | "INTER_MODULE" | "ALL"

        const query: Record<string, unknown> = {
            $or: [
                { fromModule: "PERSONAL" },
                { toModule: "PERSONAL" },
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

        if (type && type !== "ALL") {
            query.remittanceType = type;
        }

        const remittances = await Remittance.find(query)
            .populate("fromBranch", "name branchName code")
            .populate("toBranch", "name branchName code")
            .populate("requestedBy", "name")
            .populate("approvedBy", "name")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, remittances });
    } catch (error) {
        console.error("Personal Remittance GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch remittances" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();
        const {
            toBranchId,
            amount,
            mode = "Cash",
            details,
            remittanceType = "INTER_BRANCH",
            fromModule = "PERSONAL",
            toModule = "PERSONAL",
            fromBranchId,
        } = body;

        // Non-admin MUST use their assigned branch as source
        const effectiveFromBranch = ctx.isAdmin
            ? (fromBranchId || ctx.branchId)
            : ctx.branchId;

        if (!effectiveFromBranch || !toBranchId) {
            return NextResponse.json(
                { success: false, error: "Source and destination branch are required" },
                { status: 400 }
            );
        }

        if (!amount || Number(amount) <= 0) {
            return NextResponse.json(
                { success: false, error: "Valid amount is required" },
                { status: 400 }
            );
        }

        if (!details || !details.trim()) {
            return NextResponse.json(
                { success: false, error: "Transfer details are required" },
                { status: 400 }
            );
        }

        // Inter-module can be within same branch, but inter-branch must be between different branches
        if (remittanceType === "INTER_BRANCH" && String(effectiveFromBranch) === String(toBranchId) && fromModule === toModule) {
            return NextResponse.json(
                { success: false, error: "Source and destination branch must be different for inter-branch transfer" },
                { status: 400 }
            );
        }

        const remittance = await Remittance.create({
            fromBranch: effectiveFromBranch,
            toBranch: toBranchId,
            amount: Number(amount),
            mode,
            details: details.trim(),
            remittanceType,
            fromModule,
            toModule,
            status: "PENDING",
            requestedBy: ctx.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined,
            date: new Date(),
        });

        return NextResponse.json({ success: true, remittance }, { status: 201 });
    } catch (error) {
        console.error("Personal Remittance POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create remittance" },
            { status: 500 }
        );
    }
}
