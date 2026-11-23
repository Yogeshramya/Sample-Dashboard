import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalLoan from "@/models/PersonalLoan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const date = new Date();
        const yMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

        const lastLoan = await PersonalLoan.findOne({
            loanId: new RegExp(`^YPL-${yMonth}-`),
        })
            .sort({ createdAt: -1 })
            .select("loanId")
            .lean();

        let nextNumber = 1;
        if (lastLoan?.loanId) {
            const parts = lastLoan.loanId.split("-");
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }

        const paddedNumber = String(nextNumber).padStart(4, "0");
        const nextLoanId = `YPL-${yMonth}-${paddedNumber}`;

        return NextResponse.json({
            success: true,
            nextLoanId,
        });
    } catch (error) {
        console.error("Failed to generate next loan ID:", error);
        return NextResponse.json(
            { success: false, nextLoanId: "YPL-0001" },
            { status: 500 }
        );
    }
}

