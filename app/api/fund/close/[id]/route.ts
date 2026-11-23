import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { Dues } from "@/types/fund";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        const loan = await Loan.findById(id);
        if (!loan) {
            return NextResponse.json(
                { error: "Loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(loan.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's loan" },
                { status: 403 }
            );
        }

        const allPaid = loan.dues.every((d: Dues) => d.paid === true);

        if (!allPaid) {
            return NextResponse.json(
                { error: "Not all dues are paid. Cannot close loan." },
                { status: 400 }
            );
        }

        loan.status = "REPAID";
        await loan.save();

        return NextResponse.json(
            { success: true, message: "Loan closed successfully" },
            { status: 200 }
        );
    } catch (err) {
        console.error("Close Loan Error:", err);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
