import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import { evaluatePersonalLoanEligibility } from "@/lib/personal-loan-eligibility";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void PersonalClient;
        void PersonalScheme;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const account = searchParams.get("account");
        const client = searchParams.get("client");

        // Single account eligibility check
        if (account) {
            const result = await evaluatePersonalLoanEligibility(account);
            if (!result) {
                return NextResponse.json(
                    { success: false, error: "Savings account not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, eligibility: result });
        }

        // Single client lookup (evaluates client's active accounts)
        if (client) {
            const accounts = await PersonalAccount.find({
                customer: client,
                status: "ACTIVE",
            }).lean();

            if (!accounts.length) {
                return NextResponse.json(
                    { success: false, error: "No active savings accounts found for this customer" },
                    { status: 404 }
                );
            }

            const evaluations = [];
            for (const acc of accounts) {
                const res = await evaluatePersonalLoanEligibility(String(acc._id));
                if (res) evaluations.push(res);
            }

            return NextResponse.json({
                success: true,
                evaluations,
                isEligible: evaluations.some((e) => e.isEligible),
            });
        }

        // List active accounts in branch with quick eligibility status
        const query: Record<string, unknown> = {
            status: "ACTIVE",
        };
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        const accounts = await PersonalAccount.find(query)
            .populate("customer", "clientId fullName mobile address panNumber idProofNumber")
            .populate("scheme", "schemeId schemeName frequency installmentAmount")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const accountList = [];
        for (const acc of accounts) {
            const evalResult = await evaluatePersonalLoanEligibility(String(acc._id));
            if (evalResult) {
                accountList.push({
                    accountNumber: acc.accountNumber,
                    accountId: String(acc._id),
                    customer: acc.customer,
                    scheme: acc.scheme,
                    eligibility: evalResult,
                });
            }
        }

        return NextResponse.json({
            success: true,
            count: accountList.length,
            accounts: accountList,
        });
    } catch (error) {
        console.error("Personal loan eligibility check error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to evaluate eligibility" },
            { status: 500 }
        );
    }
}

