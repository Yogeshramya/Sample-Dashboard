import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import User from "@/models/User";
import Group from "@/models/Group";
import Loan from "@/models/Loan";
import Scheme from "@/models/Scheme";

const secret = process.env.NEXTAUTH_SECRET!;

const clientPopulate = [
    { path: "employee", select: "name phone", model: User },
    {
        path: "group",
        select: "groupName employee createdBy collectionDay groupId",
        model: Group,
        populate: [
            { path: "employee", select: "name", model: User },
            { path: "createdBy", select: "name", model: User },
        ],
    },
];

const loanPopulate = [
    { path: "employee", select: "name", model: User },
    { path: "scheme", select: "schemeName interestRate tenure totalWeeks", model: Scheme },
    { path: "group", select: "groupName groupId collectionDay", model: Group },
];

export async function GET(req: Request) {
    try {
        await connectDB();

        const token = await getToken({ req: req as NextRequest, secret });
        if (!token) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("customerCode")?.trim();
        const exact = searchParams.get("exact") === "true";

        if (!code) {
            return NextResponse.json(
                { success: false, message: "customerCode parameter is required" },
                { status: 400 }
            );
        }

        const branchId = token.branch?._id;

        const baseQuery: Record<string, unknown> = {
            ...(branchId && { branch: branchId }),
        };

        /* ================= 1. AUTOCOMPLETE / LIST SEARCH ================= */
        if (!exact) {
            baseQuery.customerCode = { $regex: code, $options: "i" };

            const clients = await Client.find(baseQuery)
                .populate(clientPopulate)
                .limit(20)
                .lean();

            return NextResponse.json({
                success: true,
                count: clients.length,
                clients,
            });
        }

        /* ================= 2. EXACT LOOKUP WITH LOAN DETAILS ================= */
        baseQuery.customerCode = { $regex: `^${code}$`, $options: "i" };

        const client = await Client.findOne(baseQuery)
            .populate(clientPopulate)
            .lean();

        if (!client) {
            return NextResponse.json(
                { success: false, message: "Customer not found" },
                { status: 404 }
            );
        }

        // Fetch all loans associated with this client sorted by most recent
        const clientLoans = await Loan.find({
            customer: client._id,
            ...(branchId && { branch: branchId }),
        })
            .sort({ createdAt: -1 })
            .populate(loanPopulate)
            .lean();

        const latestLoan = clientLoans.length > 0 ? clientLoans[0] : null;

        // Compute summary metrics for the latest loan
        let lastLoanSummary = null;

        if (latestLoan) {
            const totalDues = latestLoan.dues?.length || 0;
            const paidDues = latestLoan.dues?.filter((d: unknown) => (d as { paid: boolean }).paid).length || 0;
            const unpaidDues = totalDues - paidDues;

            const totalPayable = latestLoan.dues?.reduce(
                (sum: number, d: unknown) => sum + ((d as { total: number }).total || 0),
                0
            ) || 0;

            const totalCollected = latestLoan.collections?.reduce(
                (sum: number, c: unknown) => sum + ((c as { amount: number }).amount || 0),
                0
            ) || 0;

            const remainingBalance = Math.max(0, totalPayable - totalCollected);

            lastLoanSummary = {
                mfLoanId: latestLoan.mfLoanId,
                status: latestLoan.status,
                loanAmount: latestLoan.loanAmount,
                loanDate: latestLoan.loanDate,
                scheme: (latestLoan.scheme as { schemeName: string })?.schemeName || "N/A",
                totalDues,
                paidDues,
                unpaidDues,
                totalPayable,
                totalCollected,
                remainingBalance,
                isNocEligible: ["REPAID", "CLOSED"].includes(latestLoan.status) && remainingBalance === 0,
            };
        }

        return NextResponse.json({
            success: true,
            client,
            lastLoan: latestLoan,
            lastLoanSummary,
            allLoansCount: clientLoans.length,
            loans: clientLoans,
        });

    } catch (error) {
        console.error("Error retrieving client & loan details:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error in retrieving client & loan details" },
            { status: 500 }
        );
    }
}