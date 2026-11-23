import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import mongoose from "mongoose";
import Group from "@/models/Group";
import User from "@/models/User";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "group", select: "groupName groupId", Group },
    { path: "employee", select: "name", User },
];

interface QueryFilter {
    branch?: mongoose.Types.ObjectId;
    employee?: string;
    group?: string;
    type?: string;
    status?: string;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);

        const status = searchParams.get("status");
        const employeeId = searchParams.get("employeeId");
        const groupId = searchParams.get("groupId");
        const type = searchParams.get("type");

        const query: QueryFilter = {};

        // Strict branch scoping
        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        if (type && type !== "ALL") {
            query.type = type;
        }

        if (status && status !== "ALL") {
            query.status = status;
        }

        // Validate ObjectId before adding to query to prevent CastErrors
        if (employeeId && employeeId !== "ALL" && mongoose.Types.ObjectId.isValid(employeeId)) {
            query.employee = employeeId;
        }

        if (groupId && groupId !== "ALL" && mongoose.Types.ObjectId.isValid(groupId)) {
            query.group = groupId;
        }

        const bills = await Bill.find(query)
            .populate(populateFields)
            .sort({ collectedAt: -1 });

        return NextResponse.json({
            success: true,
            bills,
        });

    } catch (error) {
        console.error("Bills fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch bills" },
            { status: 500 }
        );
    }
}
