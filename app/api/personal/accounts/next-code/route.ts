import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalAccount from "@/models/PersonalAccount";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const lastAccount = await PersonalAccount.findOne()
            .sort({ createdAt: -1 })
            .select("accountNumber")
            .lean();

        let nextNumber = 1;
        if (lastAccount?.accountNumber) {
            const match = lastAccount.accountNumber.match(/\d+/g);
            if (match) {
                const lastNum = parseInt(match[match.length - 1], 10);
                if (!isNaN(lastNum)) {
                    nextNumber = lastNum + 1;
                }
            }
        }

        const paddedNumber = String(nextNumber).padStart(4, "0");
        const nextCode = `YPS-${paddedNumber}`;

        return NextResponse.json({
            success: true,
            nextCode,
        });
    } catch (error) {
        console.error("Failed to generate next account number:", error);
        return NextResponse.json(
            { success: false, nextCode: "YPS-0001" },
            { status: 500 }
        );
    }
}
