import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Client from "@/models/Client";
import SavingsDraft from "@/models/SavingsDraft";
import { Dues } from "@/types/fund";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get("clientId");

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: "clientId is required" },
                { status: 400 }
            );
        }

        const client = await Client.findById(clientId);
        if (!client) {
            return NextResponse.json(
                { success: false, error: "Client not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized access to another branch's customer" },
                { status: 403 }
            );
        }

        /* ================= GET LOANS ================= */

        const loans = await Loan.find({
            customer: clientId,
            status: { $in: ["APPROVED", "REPAID"] },
            $or: [
                { savingsRefunded: { $exists: false } },
                { savingsRefunded: false },
            ],
        }).lean();

        /* ================= PAID SAVINGS ================= */

        let paidSavings = 0;

        for (const loan of loans) {
            const loanPaidSavings = (loan.dues || [])
                .filter((d: Dues) => d.paid === true)
                .reduce(
                    (sum: number, d: Dues) => sum + Number(d.savings || 0),
                    0
                );

            paidSavings += loanPaidSavings;
        }

        /* ================= DRAFT SAVINGS ================= */

        const draft = await SavingsDraft.findOne({ customerId: clientId }).lean();

        const draftSavings = Number(draft?.totalSavings || 0);

        /* ================= RESPONSE ================= */

        return NextResponse.json({
            success: true,
            paidSavings,
            draftSavings,
            totalSavings: paidSavings + draftSavings,
            loanCount: loans.length,
        });

    } catch (error) {
        console.error("Total savings error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
