import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalDeposit from "@/models/PersonalDeposit";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import { PersonalDeposit as IPersonalDeposit } from "@/types/personal";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        void PersonalAccount;
        void PersonalClient;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get("accountId");
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const status = searchParams.get("status");

        const query: Record<string, unknown> = {};

        // Strict branch isolation
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        if (accountId) {
            query.account = accountId;
        }

        if (status && status !== "ALL") {
            query.status = status;
        }

        if (from && to) {
            const start = new Date(from);
            const end = new Date(to);
            end.setUTCHours(23, 59, 59, 999);
            query.depositDate = { $gte: start, $lte: end };
        }

        const deposits = await PersonalDeposit.find(query)
            .populate("account", "accountNumber frequency installmentAmount totalDeposited maturityAmount")
            .populate("customer", "clientId fullName mobile")
            .populate("collectedBy", "name")
            .populate("approvedBy", "name")
            .sort({ depositDate: -1 })
            .lean();

        const totalAmount = deposits.reduce((sum: number, d: IPersonalDeposit) => sum + (d.amount || 0), 0);

        return NextResponse.json({
            success: true,
            count: deposits.length,
            totalAmount,
            deposits,
        });
    } catch (error) {
        console.error("Personal deposits GET error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const data = await req.json();

        const account = await PersonalAccount.findById(data.accountId);
        if (!account) {
            return NextResponse.json({ success: false, message: "Savings Account not found" }, { status: 404 });
        }

        // Branch authorization check
        if (!ctx.isAdmin) {
            const accBranchStr = String(account.branchId);
            if (accBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, message: "Unauthorized: Account belongs to another branch" },
                    { status: 403 }
                );
            }
        }

        // Check account approval status
        if (account.status !== "ACTIVE") {
            return NextResponse.json(
                {
                    success: false,
                    message: account.status === "PENDING"
                        ? "This savings account is pending admin approval. Deposits cannot be collected until approved."
                        : `Cannot collect deposit on an account with status '${account.status}'`,
                },
                { status: 400 }
            );
        }

        // Generate next receipt number
        const lastDeposit = await PersonalDeposit.findOne().sort({ createdAt: -1 }).select("receiptNo").lean();
        let nextNum = 1;
        if (lastDeposit?.receiptNo) {
            const match = lastDeposit.receiptNo.match(/\d+/g);
            if (match) {
                const num = parseInt(match[match.length - 1], 10);
                if (!isNaN(num)) nextNum = num + 1;
            }
        }
        const receiptNo = `REC-${String(nextNum).padStart(4, "0")}`;

        const installmentCount = Number(data.installmentCount || 1);
        const amount = Number(data.amount || account.installmentAmount * installmentCount);

        const newDeposit = new PersonalDeposit({
            receiptNo,
            account: account._id,
            customer: account.customer,
            branchId: account.branchId || ctx.branchObjectId,
            collectedBy: ctx.userId,
            installmentCount,
            amount,
            paymentMethod: data.paymentMethod || "CASH",
            depositDate: data.depositDate ? new Date(data.depositDate) : new Date(),
            remarks: data.remarks || "",
            status: "PENDING",
        });

        await newDeposit.save();

        return NextResponse.json({
            success: true,
            message: "Deposit submitted and sent for Administrator Approval",
            deposit: newDeposit,
            account,
        });
    } catch (error) {
        console.error("Personal deposit POST error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
