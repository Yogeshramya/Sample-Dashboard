import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import mongoose, { Schema, models, model } from "mongoose";
import Debit from "@/models/Debit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getTodayIST, parseISTDate } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "branch", select: "_id name code", model: Branch },
];

const CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model("Counter", CounterSchema);

/* ================= CREATE PERSONAL SAVINGS DEBIT ================= */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });

        const rawBranchId = token?.activeBranch?._id || token?.branch?._id || token?.branch;

        if (!token || !rawBranchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const branchId = typeof rawBranchId === "string" ? rawBranchId : rawBranchId._id;
        const body = await req.json();

        // Auto-increment code YP-SD00001 (Smart Savings Debit)
        const counter = await Counter.findByIdAndUpdate(
            { _id: "personal_debit_code" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const sequentialNumber = String(counter.seq).padStart(5, "0");
        const generatedCode = `YP-SD${sequentialNumber}`;

        const debit = await Debit.create({
            ...body,
            code: generatedCode,
            employee: token.id,
            branch: branchId,
            module: "PERSONAL",
        });

        return NextResponse.json(
            { success: true, debit, code: generatedCode },
            { status: 201 }
        );
    } catch (error) {
        console.error("Personal Debit POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create savings debit" },
            { status: 500 }
        );
    }
}

/* ================= GET PERSONAL SAVINGS DEBIT REPORT ================= */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });

        const rawBranchId =
            token?.activeBranch?._id ||
            token?.branch?._id ||
            token?.branch;

        if (!token || !rawBranchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const branchId = new mongoose.Types.ObjectId(
            typeof rawBranchId === "string" ? rawBranchId : rawBranchId._id
        );

        const { searchParams } = new URL(req.url);

        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");
        let start = searchParams.get("start");
        let end = searchParams.get("end");
        const title = searchParams.get("title");
        const status = searchParams.get("status") || "APPROVED";

        if (token.role === "TELLER") {
            const today = getTodayIST();
            start = today;
            end = today;
        }

        const findFilter: Record<string, unknown> = {
            branch: branchId,
            module: "PERSONAL",
        };

        if (status !== "ALL") {
            findFilter.status = status;
        }

        if (start || end) {
            findFilter.date = {};
            if (start) {
                (findFilter.date as Record<string, Date>).$gte = parseISTDate(start, false);
            }
            if (end) {
                (findFilter.date as Record<string, Date>).$lte = parseISTDate(end, true);
            }
        }

        if (title && title !== "ALL") {
            findFilter.title = title;
        }

        if (pageParam && limitParam) {
            const page = Math.max(1, parseInt(pageParam));
            const limit = Math.max(1, parseInt(limitParam));
            const skip = (page - 1) * limit;

            const [records, total] = await Promise.all([
                Debit.find(findFilter)
                    .populate(populateFields)
                    .sort({ date: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Debit.countDocuments(findFilter),
            ]);

            const grandTotalAgg = await Debit.aggregate([
                { $match: findFilter },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]);
            const grandTotal = grandTotalAgg[0]?.total || 0;

            return NextResponse.json({
                success: true,
                records,
                grandTotal,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }

        const records = await Debit.find(findFilter)
            .populate(populateFields)
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const grandTotal = records.reduce((sum, item) => sum + (item.amount || 0), 0);

        return NextResponse.json({
            success: true,
            records,
            grandTotal,
        });
    } catch (error) {
        console.error("Personal Debit GET error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch savings debits" },
            { status: 500 }
        );
    }
}

