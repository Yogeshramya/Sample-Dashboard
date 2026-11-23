import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

import Loan from "@/models/Loan";
import Client from "@/models/Client";
import Group from "@/models/Group";
import Scheme from "@/models/Scheme";
import User from "@/models/User";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "customer", select: "customerCode name phone", model: Client },
    { path: "scheme", select: "schemeName", model: Scheme },
    { path: "group", select: "_id groupName", model: Group },
];

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const query: Record<string, unknown> = {
            status: "PENDING",
        };

        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        // Fetch pending loans
        const loans = await Loan.find(query)
            .sort({ createdAt: -1 })
            .populate(populateFields)
            .lean();

        return NextResponse.json({
            success: true,
            count: loans.length,
            loans,
        });
    } catch (error) {
        console.error("Pending Fund API Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch pending funds" },
            { status: 500 }
        );
    }
}
