import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import mongoose from "mongoose";
import { getTodayIST, parseISTDate } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;
interface Filter {
    $gte?: Date;
    $lte?: Date;
}

interface Match {
    branch: mongoose.Types.ObjectId;
    updatedAt?: Filter;
    group?: mongoose.Types.ObjectId;
    employee?: mongoose.Types.ObjectId;
    savingsRefunded: { $in: boolean[] };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        /* ================= AUTH ================= */
        const token = await getToken({ req, secret });
        if (!token || !token.branch?._id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const branchId = new mongoose.Types.ObjectId(token.branch._id);

        /* ================= QUERY PARAMS ================= */
        const { searchParams } = new URL(req.url);
        let from = searchParams.get("from");
        let to = searchParams.get("to");
        const group = searchParams.get("group");
        const employee = searchParams.get("employee");

        if (token.role === "TELLER") {
            const today = getTodayIST();
            from = today;
            to = today;
        }

        /* ================= DATE FILTER ================= */
        const dateFilter: Filter = {};
        if (from) {
            dateFilter.$gte = parseISTDate(from, false);
        }
        if (to) {
            dateFilter.$lte = parseISTDate(to, true);
        }

        /* ================= MATCH ================= */
        const match: Match = {
            branch: branchId,

            // handle missing field safely
            savingsRefunded: { $in: [true] },
        };

        if (Object.keys(dateFilter).length) {
            match.updatedAt = dateFilter;
        }

        if (group && group !== "ALL") {
            match.group = new mongoose.Types.ObjectId(group);
        }

        if (employee && employee !== "ALL") {
            match.employee = new mongoose.Types.ObjectId(employee);
        }

        /* ================= AGGREGATION ================= */
        const rows = await Loan.aggregate([
            { $match: match },

            { $unwind: "$dues" },

            /* COUNT ONLY PAID SAVINGS */
            {
                $match: {
                    "dues.paid": true,
                },
            },

            {
                $group: {
                    _id: "$_id",
                    mfLoanId: { $first: "$mfLoanId" },
                    loanAmount: { $first: "$loanAmount" },
                    customer: { $first: "$customer" },
                    group: { $first: "$group" },
                    employee: { $first: "$employee" },
                    refundedAt: { $first: "$updatedAt" },

                    totalSavings: { $sum: "$dues.savings" },
                },
            },

            /* ================= POPULATE ================= */
            {
                $lookup: {
                    from: "clients",
                    localField: "customer",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$customer" },

            {
                $lookup: {
                    from: "groups",
                    localField: "group",
                    foreignField: "_id",
                    as: "group",
                },
            },
            { $unwind: "$group" },

            {
                $lookup: {
                    from: "users",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employee",
                },
            },
            { $unwind: "$employee" },

            {
                $project: {
                    _id: 1,
                    loanId: "$_id",
                    mfLoanId: 1,
                    loanAmount: 1,
                    refundedAt: 1,
                    totalSavings: 1,

                    customerId: "$customer._id",
                    customerCode: "$customer.customerCode",
                    customerName: "$customer.name",
                    customerPhone: "$customer.phone",
                    groupName: "$group.groupName",
                    groupId: "$group.groupId",
                    employeeName: "$employee.name",
                },
            },

            { $sort: { refundedAt: -1 } },
        ]);

        return NextResponse.json({
            success: true,
            rows,
        });
    } catch (error) {
        console.error("Savings refund report error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch savings refund report" },
            { status: 500 }
        );
    }
}
