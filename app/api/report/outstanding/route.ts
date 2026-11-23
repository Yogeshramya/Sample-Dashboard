import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        /* AUTH */
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        /* FILTER PARAMS */
        const groupId = req.nextUrl.searchParams.get("group");
        const from = req.nextUrl.searchParams.get("from");
        const to = req.nextUrl.searchParams.get("to");

        const match: {
            branch?: mongoose.Types.ObjectId;
            status?: { $in: string[] };
            group?: mongoose.Types.ObjectId;
            createdAt?: { $gte?: Date; $lte?: Date };
        } = {
            status: { $in: ["APPROVED", "ARREAR", "REPAID"] },
        };

        if (ctx.branchObjectId) {
            match.branch = ctx.branchObjectId;
        }

        if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
            match.group = new mongoose.Types.ObjectId(groupId);
        }

        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = parseISTDate(from, false);
            if (to) match.createdAt.$lte = parseISTDate(to, true);
        }

        const now = new Date();

        const rows = await Loan.aggregate([
            /* FILTER LOANS */
            {
                $match: match,
            },

            /* LOOKUP CLIENT */
            {
                $lookup: {
                    from: "clients",
                    localField: "customer",
                    foreignField: "_id",
                    as: "client",
                },
            },

            { $unwind: "$client" },

            /* REMOVE CLOSED CLIENTS */
            {
                $match: {
                    "client.status": { $ne: "CLOSED" },
                },
            },

            /* UNWIND DUES */
            { $unwind: "$dues" },

            /* GROUP PER LOAN */
            {
                $group: {
                    _id: {
                        loanId: "$_id",
                        group: "$group",
                    },

                    loanAmount: { $first: "$loanAmount" },
                    totalPrincipal: { $sum: "$dues.principal" },

                    paidPrincipal: {
                        $sum: {
                            $cond: ["$dues.paid", "$dues.principal", 0],
                        },
                    },

                    totalInterest: { $sum: "$dues.interest" },

                    paidInterest: {
                        $sum: {
                            $cond: ["$dues.paid", "$dues.interest", 0],
                        },
                    },

                    paidSavings: {
                        $sum: {
                            $cond: ["$dues.paid", "$dues.savings", 0],
                        },
                    },

                    // Calculate real overdue amount (unpaid and due date has passed)
                    overdueAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$dues.paid", false] },
                                        { $lt: ["$dues.dueDate", now] }
                                    ]
                                },
                                { $add: ["$dues.principal", "$dues.interest"] },
                                0
                            ]
                        }
                    },

                    members: { $addToSet: "$customer" },
                },
            },

            /* GROUP PER GROUP */
            {
                $group: {
                    _id: "$_id.group",

                    loanAmount: { $sum: "$loanAmount" },

                    totalPrincipal: { $sum: "$totalPrincipal" },
                    paidPrincipal: { $sum: "$paidPrincipal" },

                    totalInterest: { $sum: "$totalInterest" },
                    paidInterest: { $sum: "$paidInterest" },

                    paidSavings: { $sum: "$paidSavings" },
                    overdueAmount: { $sum: "$overdueAmount" },

                    members: { $addToSet: "$members" },
                },
            },

            /* LOOKUP GROUP */
            {
                $lookup: {
                    from: "groups",
                    localField: "_id",
                    foreignField: "_id",
                    as: "group",
                },
            },

            { $unwind: "$group" },

            /* FINAL RESULT */
            {
                $project: {
                    _id: 0,

                    groupName: "$group.groupName",

                    members: {
                        $size: {
                            $reduce: {
                                input: "$members",
                                initialValue: [],
                                in: {
                                    $setUnion: ["$$value", "$$this"],
                                },
                            },
                        },
                    },

                    loanAmount: 1,

                    totalPrincipal: 1,
                    paidPrincipal: 1,

                    pendingPrincipal: {
                        $subtract: ["$totalPrincipal", "$paidPrincipal"],
                    },

                    totalInterest: 1,
                    paidInterest: 1,

                    pendingInterest: {
                        $subtract: ["$totalInterest", "$paidInterest"],
                    },

                    paidSavings: 1,
                    overdueAmount: 1, // Exposed safely here

                    totalOutstanding: {
                        $add: [
                            { $subtract: ["$totalPrincipal", "$paidPrincipal"] },
                            { $subtract: ["$totalInterest", "$paidInterest"] },
                        ],
                    },

                    status: {
                        $cond: [
                            { $eq: ["$group.status", "CLOSED"] },
                            "CLOSED",
                            "ACTIVE",
                        ],
                    },
                },
            },

            { $sort: { groupName: 1 } },
        ]);

        return NextResponse.json({
            success: true,
            rows,
        });

    } catch (error) {
        console.error("Group financial summary error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch report" },
            { status: 500 }
        );
    }
}
