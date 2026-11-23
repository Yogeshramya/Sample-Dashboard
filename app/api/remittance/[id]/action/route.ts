import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Remittance from "@/models/Remittance";
import Debit from "@/models/Debit";
import Credit from "@/models/Credit";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import mongoose from "mongoose";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req as NextRequest);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { action } = await req.json();
        const { id } = await params;

        const remittance = await Remittance.findById(id);
        if (!remittance) {
            return NextResponse.json({ success: false, error: "Remittance not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const toBranchStr = String(remittance.toBranch);
            const fromBranchStr = String(remittance.fromBranch);
            if (toBranchStr !== ctx.branchId && fromBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized: Remittance does not involve your branch" },
                    { status: 403 }
                );
            }
        }

        if (remittance.status !== "PENDING") {
            return NextResponse.json({ success: false, error: "Request is already processed" }, { status: 400 });
        }

        if (action === "REJECT") {
            remittance.status = "REJECTED";
            if (ctx.userId) {
                remittance.approvedBy = new mongoose.Types.ObjectId(ctx.userId);
            }
            await remittance.save();
            return NextResponse.json({ success: true, message: "Request rejected" });
        }

        if (action === "APPROVE") {
            remittance.status = "APPROVED";
            if (ctx.userId) {
                remittance.approvedBy = new mongoose.Types.ObjectId(ctx.userId);
            }
            await remittance.save();

            // 1. Create DEBIT entry for the sending branch
            await Debit.create({
                date: remittance.date,
                module: "MFI",
                title: "Branch Remittance Transfer Out",
                details: `Remittance sent to branch ID: ${remittance.toBranch}. Note: ${remittance.details}`,
                amount: remittance.amount,
                mode: remittance.mode,
                status: "APPROVED",
                branch: remittance.fromBranch,
                employee: remittance.requestedBy,
            });

            // 2. Create CREDIT entry for the receiving branch
            await Credit.create({
                date: remittance.date,
                module: "MFI",
                title: "Branch Remittance Transfer In",
                details: `Remittance received from branch ID: ${remittance.fromBranch}. Note: ${remittance.details}`,
                amount: remittance.amount,
                mode: remittance.mode,
                status: "APPROVED",
                branch: remittance.toBranch,
                employee: remittance.requestedBy,
            });

            return NextResponse.json({ success: true, message: "Remittance approved and balances updated" });
        }

        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("Remittance Action Error:", err);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
