import { NextRequest, NextResponse } from "next/server";
import mongoose, { Schema, models, model } from "mongoose";
import Debit from "@/models/Debit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "branch", select: "_id name code", model: Branch },
];

interface Filter {
    branch?: mongoose.Types.ObjectId;
    date?: { $gte?: Date; $lte?: Date };
    title?: string | { $not: RegExp };
    status?: string;
    module?: { $ne: string } | string;
}

// Standalone counter model handled exclusively at API level (no model hooks)
const CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model("Counter", CounterSchema);

/* ================= CREATE DEBIT ================= */
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

        // 1. Generate auto-increment code YP-E00001 atomically in API handler
        const counter = await Counter.findByIdAndUpdate(
            { _id: "debit_code" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const sequentialNumber = String(counter.seq).padStart(5, "0");
        const generatedCode = `YP-E${sequentialNumber}`;

        // 2. Create debit with assigned code
        const debit = await Debit.create({
            ...body,
            module: "MFI",
            code: generatedCode,
            employee: ctx.userId,
            branch: ctx.branchObjectId,
        });

        return NextResponse.json(
            { success: true, debit, code: generatedCode },
            { status: 201 }
        );
    } catch (error) {
        console.error("Debit POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create debit" },
            { status: 500 }
        );
    }
}

/* ================= GET DEBIT REPORT ================= */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);

        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");
        let start = searchParams.get("start");
        let end = searchParams.get("end");
        const title = searchParams.get("title");
        const excludeLoanDisbursement = searchParams.get("excludeLoan") !== "false";

        if (ctx.isTeller) {
            const today = getTodayIST();
            start = today;
            end = today;
        }

        /* ================= FIND FILTER ================= */
        const findFilter: Filter = {
            status: "APPROVED",
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
        } else if (excludeLoanDisbursement) {
            // Exclude loan disbursement from standard expense reports
            findFilter.title = { $not: /loan disbursement/i };
        }

        // Build Query
        let query = Debit.find(findFilter)
            .populate(populateFields)
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Only paginate if explicit page/limit are provided
        if (pageParam && limitParam) {
            const page = Math.max(1, Number(pageParam) || 1);
            const limit = Math.max(1, Number(limitParam) || 10);
            const skip = (page - 1) * limit;
            query = query.skip(skip).limit(limit);
        }

        const debits = await query;

        /* ================= SUMMARY ================= */
        const matchStage: Filter = {
            status: "APPROVED",
            module: { $ne: "PERSONAL" },
        };
        if (ctx.branchObjectId) matchStage.branch = ctx.branchObjectId;
        if (findFilter.date) matchStage.date = findFilter.date;
        if (findFilter.title) matchStage.title = findFilter.title;

        const summaryAgg = await Debit.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    cashAmount: {
                        $sum: {
                            $cond: [{ $eq: ["$mode", "Cash"] }, "$amount", 0],
                        },
                    },
                    bankAmount: {
                        $sum: {
                            $cond: [{ $eq: ["$mode", "Bank"] }, "$amount", 0],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        const summary = summaryAgg[0] || {
            totalAmount: 0,
            cashAmount: 0,
            bankAmount: 0,
            count: 0,
        };

        return NextResponse.json({
            success: true,
            count: debits.length,
            debits,
            summary,
        });
    } catch (error) {
        console.error("Debit GET error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch debits" },
            { status: 500 }
        );
    }
}
