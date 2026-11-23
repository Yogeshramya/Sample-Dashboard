import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface Query {
    branch?: mongoose.Types.ObjectId;
    employee?: string;
    group?: string;
    weekNo?: number;
    type?: string;
    collectedAt?: { $gte?: Date; $lte?: Date };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);

        const employeeId = searchParams.get("employeeId"); // optional
        const groupId = searchParams.get("groupId");       // optional
        const weekNo = searchParams.get("weekNo");         // optional
        const type = searchParams.get("type");             // "Normal" | "PreClose" optional
        const today = searchParams.get("today");           // "true" optional
        const from = searchParams.get("from");             // "YYYY-MM-DD"
        const to = searchParams.get("to");                 // "YYYY-MM-DD"

        const query: Query = {};
        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        if (employeeId) query.employee = employeeId;
        if (groupId) query.group = groupId;
        if (weekNo) query.weekNo = Number(weekNo);
        if (type) query.type = type;

        // Today filter (on collectedAt)
        if (today === "true") {
            const start = new Date();
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date();
            end.setUTCHours(23, 59, 59, 999);
            query.collectedAt = { $gte: start, $lte: end };
        }

        // Date range filter (on collectedAt)
        if (from && to) {
            const startDate = new Date(from);
            const endDate = new Date(to);
            endDate.setUTCHours(23, 59, 59, 999);
            query.collectedAt = { $gte: startDate, $lte: endDate };
        }

        const bills = await Bill.find(query)
            .populate([
                { path: "employee", select: "name", model: User },
                { path: "group", select: "groupName groupId", model: Group },
            ])
            .sort({ collectedAt: -1 });

        return NextResponse.json({
            success: true,
            count: bills.length,
            bills,
        });
    } catch (error) {
        console.error("Bill list error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch bills" },
            { status: 500 }
        );
    }
}
