import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";
import { syncArrearLoans } from "@/lib/arrear";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        try {
            await syncArrearLoans(branchId ? String(branchId) : undefined);
        } catch (syncErr) {
            console.error("Arrear sync warning:", syncErr);
        }

        const query: Record<string, unknown> = {};
        if (branchId) {
            query.branch = branchId;
        }

        const arrears = await ArrearLoan.find(query)
            .populate("group", "groupName groupId")
            .populate({
                path: "loan",
                select: "mfLoanId loanAmount customer phone",
                populate: {
                    path: "customer",
                    select: "name phone customerCode",
                },
            })
            .populate("branch", "name code")
            .populate("partialPayments.collectedBy", "name")
            .sort({ status: 1, remainingAmount: -1, createdAt: -1 });

        return NextResponse.json({ success: true, arrears });
    } catch (err) {
        console.error("Arrear report route error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
