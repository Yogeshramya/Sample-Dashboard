import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import Scheme from "@/models/Scheme";
import Client from "@/models/Client";
import Group from "@/models/Group";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "scheme", select: "schemeName", model: Scheme },
    { path: "customer", select: "customerCode name phone nominee.name nominee.phone nominee.relation", model: Client },
    { path: "group", select: "_id groupName employee.name", model: Group },
];

export async function GET(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get("groupId");

        if (!groupId) {
            return NextResponse.json({ error: "groupId is required" }, { status: 400 });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(group.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's group" },
                { status: 403 }
            );
        }

        const loans = await Loan.find({
            group: groupId,
            status: "APPROVED",
        }).populate(populateFields).lean();

        return NextResponse.json({ loans });
    } catch (err) {
        console.error("Loans API Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
