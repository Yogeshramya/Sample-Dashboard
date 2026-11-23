import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import mongoose from "mongoose";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface Filter {
    branch?: mongoose.Types.ObjectId;
    employee?: string;
    status?: string;
    $or?: Array<Record<string, Record<string, Date>>>;
}

export async function GET(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get("employee");
        const status = searchParams.get("status");
        let from = searchParams.get("from");
        let to = searchParams.get("to");

        if (ctx.isTeller && status === "CLOSED") {
            const today = getTodayIST();
            from = today;
            to = today;
        }

        const filter: Filter = {};
        if (ctx.branchObjectId) {
            filter.branch = ctx.branchObjectId;
        }

        if (employeeId) {
            filter.employee = employeeId;
        }
        if (status) {
            filter.status = status;
        }

        if (from || to) {
            const dateFilter: Record<string, Date> = {};
            if (from) dateFilter.$gte = parseISTDate(from, false);
            if (to) dateFilter.$lte = parseISTDate(to, true);
            filter.$or = [{ closedAt: dateFilter }, { updatedAt: dateFilter }];
        }

        const groups = await Group.find(filter)
            .populate("branch")
            .populate("employee");

        return NextResponse.json({
            success: true,
            groups,
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error },
            { status: 400 }
        );
    }
}
