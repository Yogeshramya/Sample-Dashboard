import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";
import { syncArrearLoans } from "@/lib/arrear";

export async function GET(req: NextRequest) {
    try {
        const secret = process.env.NEXTAUTH_SECRET;

        if (!secret) {
            return NextResponse.json(
                { success: false, error: "Authentication is not configured" },
                { status: 500 }
            );
        }

        const token = await getToken({ req, secret });

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        await connectDB();

        // Automatically sync arrear records from active loans
        try {
            await syncArrearLoans(branchId ? String(branchId) : undefined);
        } catch (syncErr) {
            console.error("Arrear sync warning:", syncErr);
        }

        const query: Record<string, unknown> = {
            status: "OPEN",
            remainingAmount: { $gt: 0 },
        };

        if (branchId) {
            query.branch = branchId;
        }

        const count = await ArrearLoan.countDocuments(query);

        return NextResponse.json(
            { success: true, count },
            {
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                },
            }
        );
    } catch (error) {
        console.error("Arrear count error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to load arrear count" },
            { status: 500 }
        );
    }
}
