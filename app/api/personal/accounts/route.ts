import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalClient from "@/models/PersonalClient";
import PersonalScheme from "@/models/PersonalScheme";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { PersonalAccount as IPersonalAccount } from "@/types/personal";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // Ensure models are registered in Mongoose
        void PersonalClient;
        void PersonalScheme;
        void User;
        void Branch;

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const frequency = searchParams.get("frequency");

        const query: Record<string, unknown> = {};

        // Strict branch scoping
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        }

        if (status && status !== "ALL") {
            if (status === "SETTLEMENT" || status === "MATURED") {
                query.status = { $in: ["MATURED", "SETTLEMENT_PENDING"] };
            } else if (status.includes(",")) {
                query.status = { $in: status.split(",") };
            } else {
                query.status = status;
            }
        }

        if (frequency && frequency !== "ALL") {
            query.frequency = frequency;
        }

        let accounts = await PersonalAccount.find(query)
            .populate("customer", "clientId fullName mobile address panNumber idProofNumber")
            .populate("scheme", "schemeId schemeName frequency installmentAmount")
            .populate("collectorId", "name phone")
            .populate("branchId", "name code")
            .sort({ createdAt: -1 })
            .lean();

        if (search) {
            const s = search.toLowerCase();
            accounts = accounts.filter((acc: IPersonalAccount) => {
                const accNo = acc.accountNumber?.toLowerCase() || "";
                const custName = typeof acc.customer === "object" ? acc.customer?.fullName?.toLowerCase() || "" : "";
                const custCode = typeof acc.customer === "object" ? acc.customer?.clientId?.toLowerCase() || "" : "";
                const custMobile = typeof acc.customer === "object" ? acc.customer?.mobile?.toLowerCase() || "" : "";
                return (
                    accNo.includes(s) ||
                    custName.includes(s) ||
                    custCode.includes(s) ||
                    custMobile.includes(s)
                );
            });
        }

        return NextResponse.json({
            success: true,
            count: accounts.length,
            accounts,
        });
    } catch (error) {
        console.error("Personal accounts GET error:", error);
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

        // Check if customer exists
        const client = await PersonalClient.findById(data.customer);
        if (!client) {
            return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
        }

        // Branch check: non-admins can only open accounts for their own branch clients
        if (!ctx.isAdmin) {
            const clientBranchStr = String(client.branchId);
            if (clientBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, message: "Unauthorized: Customer belongs to another branch" },
                    { status: 403 }
                );
            }
        }

        // Check if scheme exists
        const scheme = await PersonalScheme.findById(data.scheme);
        if (!scheme) {
            return NextResponse.json({ success: false, message: "Scheme not found" }, { status: 404 });
        }

        // Calculate start and maturity dates based on scheme duration
        const durationMonths = scheme.durationMonths || 12;
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + durationMonths);

        const assignedBranchId = ctx.isAdmin
            ? (data.branchId || client.branchId || ctx.branchId)
            : ctx.branchObjectId;

        const newAccount = new PersonalAccount({
            accountNumber: data.accountNumber,
            customer: client._id,
            scheme: scheme._id,
            branchId: assignedBranchId,
            collectorId: data.collectorId || ctx.userId,
            frequency: scheme.frequency,
            installmentAmount: scheme.installmentAmount,
            durationMonths,
            totalTargetInstallments: scheme.totalInstallments,
            paidInstallments: 0,
            totalDeposited: 0,
            benefitAmount: scheme.benefitAmount,
            maturityAmount: scheme.maturityAmount,
            startDate,
            maturityDate,
            status: "PENDING",
            approvedBy: null,
            approvedAt: null,
            nomineeName: data.nomineeName || client.guarantorName,
            nomineeRelation: data.nomineeRelation || client.guarantorRelation,
            nomineePhone: data.nomineePhone || client.guarantorMobile,
            remarks: data.remarks || "",
        });

        await newAccount.save();

        // Update client status
        await PersonalClient.findByIdAndUpdate(client._id, {
            status: "Active Saver",
        });

        return NextResponse.json({
            success: true,
            account: newAccount,
        });
    } catch (error) {
        console.error("Personal account POST error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
