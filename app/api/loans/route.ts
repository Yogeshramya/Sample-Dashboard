import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    await connectDB();
    const ctx = await getBranchContext(req);
    const unauth = unauthorizedBranchResponse(ctx);
    if (unauth) return unauth;

    const query: Record<string, unknown> = {};
    if (ctx.branchObjectId) {
        query.branch = ctx.branchObjectId;
    }

    const loans = await Loan.find(query);
    return NextResponse.json(loans);
}

export async function POST(req: NextRequest) {
    await connectDB();
    const ctx = await getBranchContext(req);
    const unauth = unauthorizedBranchResponse(ctx);
    if (unauth) return unauth;

    if (!ctx.branchObjectId) {
        return NextResponse.json({ error: "Branch required" }, { status: 400 });
    }

    const body = await req.json();
    const loan = await Loan.create({
        ...body,
        branch: ctx.branchObjectId,
    });
    return NextResponse.json(loan);
}
