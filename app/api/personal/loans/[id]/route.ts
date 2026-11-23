import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalScheme from "@/models/PersonalScheme";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";
import User from "@/models/User";
import Branch from "@/models/Branch";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        void PersonalClient;
        void PersonalAccount;
        void PersonalScheme;
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;

        const loan = await PersonalLoan.findById(id)
            .populate("customer")
            .populate("personalAccount")
            .populate("scheme")
            .populate("collectorId", "name phone")
            .populate("branchId", "name code")
            .populate("verifiedBy", "name")
            .populate("approvedBy", "name")
            .populate("disbursedBy", "name")
            .populate("closedBy", "name")
            .lean();

        if (!loan) {
            return NextResponse.json(
                { success: false, error: "Personal loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin) {
            const branchStr = String(loan.branchId?._id || loan.branchId);
            if (branchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized access to this loan" },
                    { status: 403 }
                );
            }
        }

        // Fetch transaction history/collections for ledger
        const collections = await PersonalLoanCollection.find({ loan: id })
            .populate("collectedBy", "name")
            .sort({ transactionDate: -1, createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            loan,
            collections,
        });
    } catch (error) {
        console.error("Personal loan details error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch loan details" },
            { status: 500 }
        );
    }
}

