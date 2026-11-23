import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";

export const runtime = "nodejs"; // IMPORTANT for exceljs buffer generation

interface Matches {
    branch: mongoose.Types.ObjectId;
    status: { $in: string[] };
    group?: mongoose.Types.ObjectId;
}

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        /* AUTH */
        const token = await getToken({ req, secret });

        if (!token || !token.branch?._id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const branchId = new mongoose.Types.ObjectId(token.branch._id);

        /* DATE FILTER (ONLY TILL MARCH 31, 2026) */
        const toDate = new Date("2026-03-31T23:59:59.999Z");

        /* OPTIONAL GROUP FILTER */
        const groupId = req.nextUrl.searchParams.get("group");

        const match: Matches = {
            branch: branchId,
            status: { $in: ["APPROVED", "REPAID"] },
        };

        if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
            match.group = new mongoose.Types.ObjectId(groupId);
        }

        /* AGGREGATION */
        const rows = await Loan.aggregate([
            { $match: match },

            /* JOIN CLIENT */
            {
                $lookup: {
                    from: "clients",
                    localField: "customer",
                    foreignField: "_id",
                    as: "client",
                },
            },
            { $unwind: "$client" },

            {
                $match: {
                    "client.status": { $ne: "CLOSED" },
                },
            },

            /* DUES */
            { $unwind: "$dues" },

            /* FILTER PAID BEFORE DATE OR PENDING */
            {
                $match: {
                    $or: [
                        {
                            "dues.paid": true,
                            "dues.paidAt": { $lte: toDate },
                        },
                        {
                            "dues.paid": false,
                        },
                    ],
                },
            },

            /* GROUP PER CUSTOMER */
            {
                $group: {
                    _id: "$customer",

                    customerName: { $first: "$client.name" },
                    customerCode: { $first: "$client.customerCode" },

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
                },
            },

            /* FINAL SHAPE */
            {
                $project: {
                    _id: 0,

                    customerCode: 1,
                    customerName: 1,

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
                },
            },

            { $sort: { customerName: 1 } },
        ]);

        /* CREATE EXCEL USING EXCELJS */
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Loan Report");

        // Define columns and widths explicitly
        worksheet.columns = [
            { header: "Sl_No", key: "sl_no", width: 10 },
            { header: "Customer_Code", key: "customerCode", width: 20 },
            { header: "Customer_Name", key: "customerName", width: 25 },
            { header: "Principal_Total", key: "principalTotal", width: 18 },
            { header: "Principal_Paid", key: "principalPaid", width: 18 },
            { header: "Principal_Pending", key: "principalPending", width: 20 },
            { header: "Interest_Total", key: "interestTotal", width: 18 },
            { header: "Interest_Paid", key: "interestPaid", width: 18 },
            { header: "Interest_Pending", key: "interestPending", width: 20 },
        ];

        // Make the header row bold
        worksheet.getRow(1).font = { bold: true };

        // Add the rows mapping directly from the DB output
        rows.forEach((r, i) => {
            worksheet.addRow({
                sl_no: i + 1,
                customerCode: r.customerCode || "-",
                customerName: r.customerName,
                principalTotal: r.totalPrincipal,
                principalPaid: r.paidPrincipal,
                principalPending: r.pendingPrincipal,
                interestTotal: r.totalInterest,
                interestPaid: r.paidInterest,
                interestPending: r.pendingInterest,
            });
        });

        // Generate the Buffer natively
        const buffer = await workbook.xlsx.writeBuffer();

        /* DOWNLOAD RESPONSE */
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": "attachment; filename=loan_report.xlsx",
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error("Loan export error:", error);

        return NextResponse.json(
            { success: false, error: "Export failed" },
            { status: 500 }
        );
    }
}