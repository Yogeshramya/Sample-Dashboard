import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import Client from "@/models/Client";
import Scheme from "@/models/Scheme";
import Group from "@/models/Group";
import SavingsDraft from "@/models/SavingsDraft";
import SavingsApproval from "@/models/Savings";
import { Dues } from "@/types/fund";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import mongoose from "mongoose";

/* ---------------- POPULATE ---------------- */

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "customer", select: "customerCode name phone", model: Client },
    { path: "scheme", select: "schemeName", model: Scheme },
    { path: "group", select: "_id groupName", model: Group },
];

export async function GET(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");

        if (!customerId) {
            return NextResponse.json(
                { success: false, error: "customerId required" },
                { status: 400 }
            );
        }

        let client = null;
        let targetLoan = null;

        if (mongoose.Types.ObjectId.isValid(customerId)) {
            // First check if the param is a direct Customer ID
            client = await Client.findById(customerId);

            if (!client) {
                // If not a customer, it may be a Loan ID (e.g. accessed from /dashboard/fund/[loanId]/savings)
                const loanById = await Loan.findById(customerId)
                    .populate(populateFields)
                    .lean();

                if (loanById) {
                    targetLoan = loanById;
                    const custRef = loanById.customer;
                    const realCustId =
                        typeof custRef === "object" && custRef !== null && "_id" in custRef
                            ? (custRef as { _id: string })._id
                            : custRef;

                    if (realCustId) {
                        client = await Client.findById(realCustId);
                    }
                }
            }
        }

        if (!client) {
            return NextResponse.json(
                { success: false, error: "Customer or Loan not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized access to another branch's customer" },
                { status: 403 }
            );
        }

        /* ---------------- ALL LOANS ---------------- */

        const loans = await Loan.find({
            customer: client._id,
        })
            .populate(populateFields)
            .sort({ createdAt: -1 })
            .lean();

        /* ---------------- LATEST OR TARGET LOAN (FOR UI) ---------------- */

        const blockingLoan = loans.find((l: any) =>
            ["PENDING", "APPROVED", "ARREAR"].includes(l.status)
        );

        const activeLoan = targetLoan || blockingLoan || (loans.length > 0 ? loans[0] : null);

        /* ---------------- LOAN SAVINGS ---------------- */

        let loanSavings = 0;

        for (const loan of loans) {
            if (!loan?.dues?.length) continue;

            loanSavings += loan.dues.reduce((sum: number, d: Dues) => {
                const s = Number(d.savings ?? 0);
                return sum + (d.paid ? s : 0);
            }, 0);
        }

        /* ---------------- DRAFT SAVINGS ---------------- */

        const draft = await SavingsDraft.findOne({
            customerId: client._id,
        }).lean();

        const draftSavings = draft?.totalSavings || 0;

        /* ---------------- APPROVAL STATUS ---------------- */

        const approval = await SavingsApproval.findOne({
            customer: client._id,
        })
            .sort({ createdAt: -1 })
            .select("status approvedAmount remarks")
            .lean();

        /* ---------------- RESPONSE ---------------- */

        return NextResponse.json({
            success: true,
            customer: client,
            customerId: client._id,
            loan: activeLoan,
            activeLoan: blockingLoan || null,
            latestLoan: loans.length > 0 ? loans[0] : null,
            hasActiveLoan: !!blockingLoan,
            loans,
            loanSavings,
            draftSavings,
            totalSavings: loanSavings + draftSavings,

            savingsRequested: activeLoan?.savingsRequested || false,
            savingsReturned: activeLoan?.savingsReturned || false,

            draft,
            refunded: draft?.refunded || false,
            approvalStatus: approval?.status || null,
            approvedAmount: approval?.approvedAmount || 0,
            remarks: approval?.remarks || "",
        });
    } catch (err) {
        console.error("Fund customer API error:", err);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
