import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";
import PersonalLoan from "@/models/PersonalLoan";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import User from "@/models/User";
import Branch from "@/models/Branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void PersonalLoan;
        void PersonalClient;
        void PersonalAccount;
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const method = searchParams.get("method");
        const type = searchParams.get("type");
        const search = searchParams.get("search");

        const query: Record<string, unknown> = {};

        // Branch Scoping
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        // Date Range
        if (from || to) {
            const dateQuery: Record<string, Date> = {};
            if (from) {
                const f = new Date(from);
                f.setHours(0, 0, 0, 0);
                dateQuery.$gte = f;
            }
            if (to) {
                const t = new Date(to);
                t.setHours(23, 59, 59, 999);
                dateQuery.$lte = t;
            }
            query.transactionDate = dateQuery;
        }

        // Payment Method
        if (method && method !== "ALL") {
            query.paymentMethod = method;
        }

        // Collection Type (DAILY, WEEKLY, MONTHLY, PRECLOSURE_SETTLEMENT)
        if (type && type !== "ALL") {
            query.collectionType = type;
        }

        let collections = await PersonalLoanCollection.find(query)
            .populate("loan", "loanId loanAmount repaymentFrequency status")
            .populate("customer", "clientId fullName mobile")
            .populate("personalAccount", "accountNumber")
            .populate("collectedBy", "name")
            .populate("branchId", "name code")
            .sort({ transactionDate: -1, createdAt: -1 })
            .lean();

        if (search) {
            const s = search.toLowerCase();
            collections = collections.filter((c: Record<string, unknown>) => {
                const rNo = String(c.receiptNo || "").toLowerCase();
                const ln = c.loan as Record<string, unknown> | null;
                const loanId = String(ln?.loanId || "").toLowerCase();
                const cust = c.customer as Record<string, unknown> | null;
                const custName = String(cust?.fullName || "").toLowerCase();
                const custMobile = String(cust?.mobile || "").toLowerCase();
                const custCode = String(cust?.clientId || "").toLowerCase();

                return (
                    rNo.includes(s) ||
                    loanId.includes(s) ||
                    custName.includes(s) ||
                    custMobile.includes(s) ||
                    custCode.includes(s)
                );
            });
        }

        const stats = {
            count: collections.length,
            totalCollected: collections.reduce((acc, c) => acc + (Number(c.totalAmount) || 0), 0),
            principalCollected: collections.reduce((acc, c) => acc + (Number(c.principalPortion) || 0), 0),
            interestCollected: collections.reduce((acc, c) => acc + (Number(c.interestPortion) || 0), 0),
            penaltyCollected: collections.reduce((acc, c) => acc + (Number(c.penaltyPortion) || 0), 0),
        };

        return NextResponse.json({
            success: true,
            count: collections.length,
            stats,
            collections,
        });
    } catch (error) {
        console.error("Personal loan collections report error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch loan collections report" },
            { status: 500 }
        );
    }
}

