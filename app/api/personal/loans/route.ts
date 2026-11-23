import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalScheme from "@/models/PersonalScheme";
import User from "@/models/User";
import Branch from "@/models/Branch";

export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const frequency = searchParams.get("frequency");
        const customerId = searchParams.get("customer");

        const query: Record<string, unknown> = {};

        // Branch Scoping
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        // Status Filter
        if (status && status !== "ALL") {
            if (status.includes(",")) {
                query.status = { $in: status.split(",") };
            } else {
                query.status = status;
            }
        }

        // Frequency Filter
        if (frequency && frequency !== "ALL") {
            query.repaymentFrequency = frequency;
        }

        if (customerId) {
            query.customer = customerId;
        }

        let loans = await PersonalLoan.find(query)
            .populate("customer", "clientId fullName mobile address panNumber idProofNumber")
            .populate("personalAccount", "accountNumber installmentAmount frequency totalDeposited")
            .populate("scheme", "schemeId schemeName")
            .populate("collectorId", "name phone")
            .populate("branchId", "name code")
            .populate("approvedBy", "name")
            .populate("disbursedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        if (search) {
            const s = search.toLowerCase();
            loans = loans.filter((ln: Record<string, unknown>) => {
                const loanId = String(ln.loanId || "").toLowerCase();
                const cust = ln.customer as Record<string, unknown> | null;
                const custName = String(cust?.fullName || "").toLowerCase();
                const custMobile = String(cust?.mobile || "").toLowerCase();
                const custCode = String(cust?.clientId || "").toLowerCase();
                const acc = ln.personalAccount as Record<string, unknown> | null;
                const accNum = String(acc?.accountNumber || "").toLowerCase();

                return (
                    loanId.includes(s) ||
                    custName.includes(s) ||
                    custMobile.includes(s) ||
                    custCode.includes(s) ||
                    accNum.includes(s)
                );
            });
        }

        // Calculate Portfolio Summary Stats
        const stats = {
            totalCount: loans.length,
            totalSanctioned: loans.reduce((acc, l) => acc + (Number(l.loanAmount) || 0), 0),
            totalDisbursed: loans
                .filter((l) => ["DISBURSED", "ACTIVE", "OVERDUE", "PRECLOSED", "CLOSED"].includes(String(l.status)))
                .reduce((acc, l) => acc + (Number(l.netDisbursedAmount || l.loanAmount) || 0), 0),
            totalOutstanding: loans
                .filter((l) => ["DISBURSED", "ACTIVE", "OVERDUE"].includes(String(l.status)))
                .reduce((acc, l) => acc + (Number(l.totalOutstanding) || 0), 0),
            totalPrincipalRepaid: loans.reduce((acc, l) => acc + (Number(l.totalPrincipalRepaid) || 0), 0),
            activeLoansCount: loans.filter((l) => l.status === "ACTIVE").length,
            overdueLoansCount: loans.filter((l) => l.status === "OVERDUE").length,
            pendingApprovalCount: loans.filter((l) => ["APPLIED", "PENDING_VERIFICATION", "VERIFIED"].includes(String(l.status))).length,
        };

        return NextResponse.json({
            success: true,
            count: loans.length,
            stats,
            loans,
        });
    } catch (error) {
        console.error("Personal loans fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch personal loans" },
            { status: 500 }
        );
    }
}

