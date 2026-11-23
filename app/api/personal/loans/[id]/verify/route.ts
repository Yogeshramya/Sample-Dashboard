import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan from "@/models/PersonalLoan";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;
        const body = await req.json();
        const { action = "VERIFY", verificationNotes = "", rejectionReason = "" } = body;

        const loan = await PersonalLoan.findById(id);
        if (!loan) {
            return NextResponse.json(
                { success: false, error: "Loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(loan.branchId) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Loan belongs to another branch" },
                { status: 403 }
            );
        }

        if (action === "VERIFY") {
            loan.status = "VERIFIED";
            loan.verificationNotes = verificationNotes || "Field & document verification passed";
            loan.verifiedBy = ctx.userId as unknown as typeof loan.verifiedBy;
            loan.verifiedAt = new Date();
        } else if (action === "REJECT") {
            loan.status = "REJECTED";
            loan.rejectionReason = rejectionReason || "Rejected during field verification";
            loan.rejectedBy = ctx.userId as unknown as typeof loan.rejectedBy;
            loan.rejectedAt = new Date();
        } else if (action === "RETURN") {
            loan.status = "APPLIED";
            loan.verificationNotes = verificationNotes || "Returned for corrections";
        }

        await loan.save();

        return NextResponse.json({
            success: true,
            message: `Loan successfully marked as ${loan.status}`,
            loan,
        });
    } catch (error) {
        console.error("Personal loan verification error:", error);
        return NextResponse.json(
            { success: false, error: "Verification update failed" },
            { status: 500 }
        );
    }
}

