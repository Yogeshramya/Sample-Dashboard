import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsDraft from "@/models/SavingsDraft";
import Client from "@/models/Client";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { customerId } = await req.json();

        if (!customerId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Customer ID required",
                },
                { status: 400 }
            );
        }

        const client = await Client.findById(customerId);
        if (!client) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Client not found",
                },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized access to another branch's customer",
                },
                { status: 403 }
            );
        }

        const draft = await SavingsDraft.findOne({ customerId });

        if (!draft) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Draft not found",
                },
                { status: 404 }
            );
        }

        if (draft.refunded) {
            return NextResponse.json({
                success: false,
                error: "Savings already refunded",
            });
        }

        draft.entries = [];
        draft.totalSavings = 0;
        draft.savingsAmount = 0;
        draft.refunded = true;
        draft.savingsReturned = true;

        await draft.save();

        return NextResponse.json({
            success: true,
            message: "Savings refunded successfully",
        });

    } catch (err) {
        console.error("SavingsDraft refund error:", err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
