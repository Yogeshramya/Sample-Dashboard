import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface Filter {
    branch?: mongoose.Types.ObjectId;
    employee?: string;
    status?: string;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const searchParams = req.nextUrl.searchParams;
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        const query: Filter = {};
        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        if (employeeId) query.employee = employeeId;
        if (status) query.status = status;

        const groups = await Group.find(query)
            .select(
                "groupId groupName totalMembers employee branch dueOn collectionDay collectionTime createdBy"
            )
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return NextResponse.json({ success: true, groups });
    } catch (error) {
        console.error("Groups fetch error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch groups",
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json({ error: "Branch is required" }, { status: 400 });
        }

        const body = await req.json();

        const {
            groupId,
            groupName,
            totalMembers,
            dueOn,
            collectionDay,
            collectionTime,
            employee,
            createdBy,
        } = body;

        // Mandatory field check
        if (
            !groupId ||
            !groupName ||
            !dueOn ||
            !collectionDay ||
            !collectionTime ||
            !employee ||
            !createdBy
        ) {
            return NextResponse.json(
                { error: "All mandatory fields must be filled!" },
                { status: 400 }
            );
        }

        // Check duplicate within branch
        const exists = await Group.findOne({
            groupId,
            branch: ctx.branchObjectId,
        }).lean();

        if (exists) {
            return NextResponse.json(
                { error: "Group ID already exists in this branch" },
                { status: 409 }
            );
        }

        const group = await Group.create({
            groupId,
            groupName,
            totalMembers: Number(totalMembers) || 0,
            dueOn,
            dueStarts: new Date(),
            collectionDay,
            collectionTime,
            employee,
            createdBy,
            branch: ctx.branchObjectId,
        });

        return NextResponse.json({ success: true, group }, { status: 201 });
    } catch (error) {
        console.error("Group create error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create group",
            },
            { status: 500 }
        );
    }
}
