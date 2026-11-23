import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import User from "@/models/User";
import Group from "@/models/Group";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "group", select: "groupName", model: Group },
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const bill = await Bill.findById(id).populate(populateFields);

        if (!bill) {
            return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(bill.branch) !== ctx.branchId) {
            return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, bill });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const body = await req.json();
        const bill = await Bill.findById(id);

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(bill.branch) !== ctx.branchId) {
            return NextResponse.json({ error: "Unauthorized access to another branch's bill" }, { status: 403 });
        }

        if (bill.status === "APPROVED") {
            return NextResponse.json(
                { error: "Approved bills cannot be modified directly. Undo approval first." },
                { status: 400 }
            );
        }

        bill.loans = body.loans || bill.loans;
        bill.totalCollected = body.totalCollected ?? bill.totalCollected;

        await bill.save();

        return NextResponse.json({ success: true, bill });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;
        const bill = await Bill.findById(id);

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(bill.branch) !== ctx.branchId) {
            return NextResponse.json({ error: "Unauthorized access to another branch's bill" }, { status: 403 });
        }

        if (bill.status === "APPROVED") {
            return NextResponse.json(
                { error: "Approved bills cannot be deleted directly. Undo approval first." },
                { status: 400 }
            );
        }

        await Bill.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Bill deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
