import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import User from "@/models/User";
import { parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        void PersonalClient;
        void PersonalScheme;
        void User;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json({ success: false, error: "Please select a branch to view settlement report" }, { status: 400 });
        }

        const branchId = ctx.branchObjectId;

        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const status = searchParams.get("status") || "SETTLED"; // SETTLED | ALL | CLOSED | MATURED

        const query: Record<string, unknown> = {
            branchId,
        };

        if (status === "ALL") {
            query.status = { $in: ["MATURED", "SETTLED", "CLOSED"] };
        } else {
            query.status = status;
        }

        if (from || to) {
            query.updatedAt = {};
            if (from) (query.updatedAt as Record<string, Date>).$gte = parseISTDate(from, false);
            if (to) (query.updatedAt as Record<string, Date>).$lte = parseISTDate(to, true);
        }

        const accounts = await PersonalAccount.find(query)
            .populate("customer", "clientId fullName mobile address panNumber idProofNumber")
            .populate("scheme", "schemeName frequency installmentAmount")
            .populate("collectorId", "name")
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();

        const totalSettledAmount = accounts.reduce(
            (sum, a) => sum + (a.maturityAmount || 0),
            0
        );

        return NextResponse.json({
            success: true,
            accounts,
            summary: {
                totalCount: accounts.length,
                totalSettledAmount,
            },
        });
    } catch (error) {
        console.error("Personal settlement report error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate personal settlement report" },
            { status: 500 }
        );
    }
}
