import { NextResponse } from "next/server";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import type { NextRequest } from "next/server";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "branch", select: "name code", model: Branch },
    { path: "branches", select: "name code", model: Branch },
];

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get("all") === "true";
        const includeAdmin = searchParams.get("includeAdmin") === "true";

        const query: Record<string, unknown> = {};

        if (!includeAdmin) {
            query.role = { $ne: "ADMINISTRATOR" };
        }

        if (!showAll && ctx.branchObjectId) {
            query.$or = [
                { branch: ctx.branchObjectId },
                { branches: ctx.branchObjectId },
                { role: "ACCOUNTS_HEAD" },
            ];
        }

        const employees = await User.find(query)
            .populate(populateFields)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            employees,
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error },
            { status: 400 }
        );
    }
}
