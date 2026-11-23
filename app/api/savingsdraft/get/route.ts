import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsDraft from "@/models/SavingsDraft";
import Client from "@/models/Client";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const customerId = req.nextUrl.searchParams.get("customerId");

        if (!customerId) {
            return NextResponse.json({
                success: false,
                error: "customerId required",
            }, { status: 400 });
        }

        const client = await Client.findById(customerId);
        if (!client) {
            return NextResponse.json({
                success: false,
                error: "Client not found",
            }, { status: 404 });
        }

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json({
                success: false,
                error: "Unauthorized access to another branch's customer",
            }, { status: 403 });
        }

        /* ================= FIND DRAFT ================= */

        let draft = await SavingsDraft.findOne({ customerId });

        /* ================= CREATE IF NOT EXISTS ================= */

        if (!draft) {
            draft = await SavingsDraft.create({
                customerId,
                branch: client.branch,
                savingsAmount: 0,
                totalSavings: 0,
                entries: [],
                refunded: false,
                savingsRequested: false,
                savingsReturned: false,
            });
        }

        return NextResponse.json({
            success: true,
            draft,
        });

    } catch (err) {
        console.error("SavingsDraft GET error:", err);
        return NextResponse.json({
            success: false,
            error: "Server error",
        }, { status: 500 });
    }
}
