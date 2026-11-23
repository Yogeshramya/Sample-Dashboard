import { NextRequest, NextResponse } from "next/server";
import Credit from "@/models/Credit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import mongoose from "mongoose";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "branch", select: "name code", model: Branch },
];

interface Filter {
    branch?: mongoose.Types.ObjectId;
    date?: { $gte?: Date; $lte?: Date };
    title?: string; // TITLE = TYPE
    status?: string;
    module?: { $ne: string } | string;
}

/* ================= CREATE CREDIT ================= */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "Branch is required" },
                { status: 400 }
            );
        }

        const body = await req.json();

        const credit = await Credit.create({
            ...body,
            module: "MFI",
            employee: ctx.userId,
            branch: ctx.branchObjectId,
        });

        return NextResponse.json(
            { success: true, credit },
            { status: 201 }
        );
    } catch (error) {
        console.error("Credit POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create credit" },
            { status: 500 }
        );
    }
}

/* ================= GET CREDIT REPORT ================= */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);

        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;
        const skip = (page - 1) * limit;

        let start = searchParams.get("start");
        let end = searchParams.get("end");
        const title = searchParams.get("title");

        if (ctx.isTeller) {
            const today = getTodayIST();
            start = today;
            end = today;
        }

        /* ================= FIND FILTER ================= */
        const findFilter: Filter = {
            module: { $ne: "PERSONAL" },
        };

        if (ctx.branchObjectId) {
            findFilter.branch = ctx.branchObjectId;
        }

        if (start || end) {
            findFilter.date = {};
            if (start) {
                findFilter.date.$gte = parseISTDate(start, false);
            }
            if (end) {
                findFilter.date.$lte = parseISTDate(end, true);
            }
        }

        if (title && title !== "ALL") {
            findFilter.title = title;
        }

        /* ================= PAGINATED DATA ================= */
        const credits = await Credit.find(findFilter)
            .populate(populateFields)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        /* ================= SUMMARY (ALL PAGES) ================= */
        const matchStage: Filter = {
            status: "APPROVED",
            module: { $ne: "PERSONAL" },
        };

        if (ctx.branchObjectId) {
            matchStage.branch = ctx.branchObjectId;
        }

        if (findFilter.date) matchStage.date = findFilter.date;
        if (findFilter.title) matchStage.title = findFilter.title;

        const summary = await Credit.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalCredit: { $sum: "$amount" },
                    totalCount: { $sum: 1 },
                },
            },
        ]);

        const totalCredits = summary[0]?.totalCredit || 0;
        const totalItems = summary[0]?.totalCount || 0;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        return NextResponse.json({
            success: true,
            credits,
            totalCredits,
            totalCount: totalItems,
            totalPages,
            currentPage: page,
        });

    } catch (error) {
        console.error("Credit GET error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch credit report" },
            { status: 500 }
        );
    }
}
