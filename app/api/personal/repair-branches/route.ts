import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalDeposit from "@/models/PersonalDeposit";
import Branch from "@/models/Branch";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.isAdmin) {
            return NextResponse.json(
                { success: false, error: "Only administrators can run data repair" },
                { status: 403 }
            );
        }

        const defaultBranch = await Branch.findOne().select("_id name code").lean();
        if (!defaultBranch) {
            return NextResponse.json(
                { success: false, error: "No branches exist in the database" },
                { status: 400 }
            );
        }

        // 1. Repair Personal Clients missing branchId
        const orphanClients = await PersonalClient.find({
            $or: [
                { branchId: { $exists: false } },
                { branchId: null },
            ],
        });

        let repairedClients = 0;
        for (const client of orphanClients) {
            // Check if any account exists for this client
            const account = await PersonalAccount.findOne({
                customer: client._id,
                branchId: { $ne: null },
            }).select("branchId").lean();

            const targetBranchId = account?.branchId || defaultBranch._id;
            await PersonalClient.findByIdAndUpdate(client._id, { branchId: targetBranchId });
            repairedClients++;
        }

        // 2. Repair Personal Accounts missing branchId
        const orphanAccounts = await PersonalAccount.find({
            $or: [
                { branchId: { $exists: false } },
                { branchId: null },
            ],
        });

        let repairedAccounts = 0;
        for (const account of orphanAccounts) {
            const client = await PersonalClient.findById(account.customer).select("branchId").lean();
            const targetBranchId = client?.branchId || defaultBranch._id;
            await PersonalAccount.findByIdAndUpdate(account._id, { branchId: targetBranchId });
            repairedAccounts++;
        }

        // 3. Repair Personal Deposits missing branchId
        const orphanDeposits = await PersonalDeposit.find({
            $or: [
                { branchId: { $exists: false } },
                { branchId: null },
            ],
        });

        let repairedDeposits = 0;
        for (const deposit of orphanDeposits) {
            const account = await PersonalAccount.findById(deposit.account).select("branchId").lean();
            const targetBranchId = account?.branchId || defaultBranch._id;
            await PersonalDeposit.findByIdAndUpdate(deposit._id, { branchId: targetBranchId });
            repairedDeposits++;
        }

        return NextResponse.json({
            success: true,
            message: "Branch data repair completed successfully",
            summary: {
                defaultBranch: defaultBranch.name,
                repairedClients,
                repairedAccounts,
                repairedDeposits,
            },
        });
    } catch (error) {
        console.error("Personal Branch Data Repair Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to repair branch data" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return POST(req);
}

