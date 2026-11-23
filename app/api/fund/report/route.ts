import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import Client from "@/models/Client";
import Scheme from "@/models/Scheme";
import Group from "@/models/Group";
import { getToken } from "next-auth/jwt";

import { getTodayIST, parseISTDate } from "@/lib/ist";

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "customer", select: "customerCode name phone", model: Client },
    { path: "scheme", select: "schemeName", model: Scheme },
    {
        path: "group",
        select: "_id groupName",
        populate:
            [{ path: "employee", select: "name", model: User },
            { path: "createdBy", select: "name" }],
        model: Group
    },
];
export async function GET(req: NextRequest) {
    await connectDB();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });

    if (!token?.branch)
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const loanAmount =
        searchParams.get("loanAmount");

    let month = searchParams.get("month"); // YYYY-MM
    let from = searchParams.get("from");   // YYYY-MM-DD
    let to = searchParams.get("to");       // YYYY-MM-DD

    if (token.role === "TELLER") {
        const today = getTodayIST();
        from = today;
        to = today;
        month = null;
    }

    try {
        let start: Date;
        let end: Date;

        // Priority: from & to
        if (from && to) {
            start = parseISTDate(from, false);
            end = parseISTDate(to, true);
        }
        // Fallback: month
        else if (month) {
            start = new Date(`${month}-01`);
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
        }
        // No valid filter
        else {
            return NextResponse.json(
                {
                    success: false,
                    error: "Provide either month (YYYY-MM) or from & to dates",
                },
                { status: 400 }
            );
        }

        const loans = await Loan.find({
            loanDate: { $gte: start, $lte: end },
            loanAmount: loanAmount ? Number(loanAmount) : { $exists: true },
            branch: token.branch?._id,
            status: "APPROVED",
        })
            .populate(populateFields)
            .sort({ loanDate: -1 });

        const totalLoanAmount = loans.reduce(
            (sum, loan) => sum + (loan.loanAmount || 0),
            0
        );

        return NextResponse.json({
            success: true,
            count: loans.length,
            from: start,
            to: end,
            totalLoanAmount,
            loans,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
