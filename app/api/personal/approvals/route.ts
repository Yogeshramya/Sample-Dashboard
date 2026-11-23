import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalDeposit from "@/models/PersonalDeposit";
import Credit from "@/models/Credit";
import Debit from "@/models/Debit";
import Remittance from "@/models/Remittance";
import CashBox from "@/models/CashBox";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const branchId = ctx.branchObjectId;
        const branchFilter = branchId ? { branchId } : {};
        const genericBranchFilter = branchId ? { branch: branchId } : {};
        const remitBranchFilter = branchId
            ? {
                  $or: [
                      { fromBranch: branchId, fromModule: "PERSONAL" as const },
                      { toBranch: branchId, toModule: "PERSONAL" as const },
                  ],
              }
            : {
                  $or: [
                      { fromModule: "PERSONAL" as const },
                      { toModule: "PERSONAL" as const },
                  ],
              };

        const [
            pendingCustomersCount,
            pendingPlansCount,
            pendingDepositsCount,
            pendingCreditsCount,
            pendingDebitsCount,
            pendingRemittancesCount,
            maturingAccountsCount,
            pendingDaySheetsCount,
        ] = await Promise.all([
            PersonalClient.countDocuments({
                ...branchFilter,
                status: "PENDING",
            }),
            PersonalAccount.countDocuments({
                ...branchFilter,
                status: "PENDING",
            }),
            PersonalDeposit.countDocuments({
                ...branchFilter,
                status: { $nin: ["APPROVED", "REJECTED"] },
            }),
            Credit.countDocuments({
                ...genericBranchFilter,
                module: "PERSONAL",
                status: "PENDING",
            }),
            Debit.countDocuments({
                ...genericBranchFilter,
                module: "PERSONAL",
                status: "PENDING",
            }),
            Remittance.countDocuments({
                ...remitBranchFilter,
                status: "PENDING",
            }),
            PersonalAccount.countDocuments({
                ...branchFilter,
                status: { $in: ["MATURED", "SETTLEMENT_PENDING"] },
            }),
            CashBox.countDocuments({
                ...genericBranchFilter,
                module: "PERSONAL",
                status: "PENDING",
            }),
        ]);

        const totalPending =
            pendingCustomersCount +
            pendingPlansCount +
            pendingDepositsCount +
            pendingCreditsCount +
            pendingDebitsCount +
            pendingRemittancesCount +
            maturingAccountsCount +
            pendingDaySheetsCount;

        return NextResponse.json({
            success: true,
            counts: {
                customers: pendingCustomersCount,
                plans: pendingPlansCount,
                deposits: pendingDepositsCount,
                credits: pendingCreditsCount,
                debits: pendingDebitsCount,
                remittances: pendingRemittancesCount,
                maturing: maturingAccountsCount,
                daySheets: pendingDaySheetsCount,
                total: totalPending,
            },
        });
    } catch (error) {
        console.error("Personal Approvals count error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch approval counts" }, { status: 500 });
    }
}
