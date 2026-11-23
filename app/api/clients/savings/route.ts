import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import Loan from "@/models/Loan";
import Group from "@/models/Group";
import SavingsDraft from "@/models/SavingsDraft";
import { Dues } from "@/types/fund";
import Savings from "@/models/Savings";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const groupId = req.nextUrl.searchParams.get("groupId");

        if (!groupId) {
            return NextResponse.json(
                { success: false, error: "groupId required" },
                { status: 400 }
            );
        }

        // Branch verification: verify group belongs to caller's branch
        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json(
                { success: false, error: "Group not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(group.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized access to another branch's group" },
                { status: 403 }
            );
        }

        /* ---------------- CLIENTS ---------------- */

        const clients = await Client.find({ group: groupId })
            .select("name phone")
            .lean();

        const results = [];

        for (const client of clients) {

            /* -------- GET ALL LOANS -------- */

            const loans = await Loan.find({
                customer: client._id,
                status: { $in: ["APPROVED", "REPAID", "CLOSED"] },
            }).lean();

            let loanSavings = 0;

            for (const loan of loans) {
                if (!loan?.dues?.length) continue;

                loanSavings += loan.dues.reduce((sum: number, d: Dues) => {
                    const s = Number(d.savings ?? 0);
                    return sum + (d.paid ? s : 0);
                }, 0);
            }

            /* -------- FIND DRAFT -------- */

            const draft = await SavingsDraft.findOne({
                customerId: client._id,
            }).lean();

            const approval = await Savings
                .findOne({ customer: client._id })
                .sort({ createdAt: -1 })
                .select("status")
                .lean();

            let draftSavings = 0;

            if (draft?.entries?.length) {
                draftSavings = draft.entries.reduce(
                    (sum: number, e: { amount: number }) =>
                        sum + Number(e.amount || 0),
                    0
                );
            }

            /* -------- TOTAL -------- */

            const totalSavings = loanSavings + draftSavings;

            results.push({
                customerId: client._id,
                name: client.name,
                phone: client.phone,

                loans: loans.map(l => ({
                    loanId: l._id,
                    status: l.status,
                })),
                loanStatus: loans.length > 0 ? loans[0].status : null,

                loanSavings,
                draftSavings,
                totalSavings,

                savingsRequested: draft?.savingsRequested || false,
                savingsReturned: draft?.refunded || false,

                approvalStatus: approval?.status || null,
            });
        }

        return NextResponse.json({
            success: true,
            customers: results,
        });

    } catch (err) {
        console.error("Clients savings API error:", err);
        return NextResponse.json({
            success: false,
            error: "Server error",
        }, { status: 500 });
    }
}
