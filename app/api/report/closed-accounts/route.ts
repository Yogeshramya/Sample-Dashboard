import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        let from = searchParams.get("from");
        let to = searchParams.get("to");

        if (ctx.isTeller) {
            const today = getTodayIST();
            from = today;
            to = today;
        }

        const query: Record<string, unknown> = {
            status: "REPAID",
        };

        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        if (from || to) {
            const updatedAtFilter: Record<string, Date> = {};
            if (from) {
                updatedAtFilter.$gte = parseISTDate(from, false);
            }
            if (to) {
                updatedAtFilter.$lte = parseISTDate(to, true);
            }
            query.updatedAt = updatedAtFilter;
        }

        const loans = await Loan.find(query)
            .populate("customer", "name phone")
            .populate("group", "groupName")
            .sort({ updatedAt: -1 });

        return NextResponse.json({ success: true, loans });

    } catch (err) {
        return NextResponse.json(
            { success: false, error: err },
            { status: 500 }
        );
    }
}
