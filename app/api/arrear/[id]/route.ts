import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const token = await getToken({ req, secret });
        if (!token)
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        const query: Record<string, unknown> = { _id: id };
        if (branchId) {
            query.branch = branchId;
        }

        const arrear = await ArrearLoan.findOne(query)
            .populate("group", "groupName groupId")
            .populate({
                path: "loan",
                select: "mfLoanId loanAmount customer phone",
                populate: {
                    path: "customer",
                    select: "name phone customerCode",
                },
            })
            .populate("partialPayments.collectedBy", "name");

        if (!arrear)
            return NextResponse.json(
                { success: false, error: "Arrear loan not found" },
                { status: 404 }
            );

        return NextResponse.json({
            success: true,
            arrear,
        });
    } catch (err) {
        console.error("Fetch arrear error", err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
