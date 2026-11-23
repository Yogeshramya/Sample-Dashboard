import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import Client from "@/models/Client";
import Scheme from "@/models/Scheme";
import Group from "@/models/Group";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface Filter {
    branch?: mongoose.Types.ObjectId;
    createdAt?: { $gte?: Date; $lt?: Date };
    status?: string | { $in: string[] };
}

/* -----------------------------------------------
   Populate Fields
------------------------------------------------ */
const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "customer", select: "customerCode name phone", model: Client },
    { path: "scheme", select: "schemeName", model: Scheme },
    { path: "group", select: "groupName", model: Group },
];

/* -----------------------------------------------
   GET — Fetch Loans (optional month filter)
------------------------------------------------ */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const status = searchParams.get("status");

        const filter: Filter = {};
        if (ctx.branchObjectId) {
            filter.branch = ctx.branchObjectId;
        }

        /* Month filter (YYYY-MM) */
        if (month) {
            const start = new Date(`${month}-01`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            filter.createdAt = {
                $gte: start,
                $lt: end,
            };
        }

        if (status === "ACTIVE") {
            filter.status = { $in: ["APPROVED", "ARREAR"] };
        } else if (status) {
            filter.status = status;
        }

        const loans = await Loan.find(filter)
            .populate(populateFields)
            .sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            loans,
            count: loans.length,
        });

    } catch (error) {
        console.error("Fetch Loans Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch loans" },
            { status: 500 }
        );
    }
}

/* -----------------------------------------------
   POST — Provide Loan
------------------------------------------------ */
export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "Branch is required to provide a loan" },
                { status: 400 }
            );
        }

        const body = await req.json();

        const {
            customer,
            scheme,
            employee,
            group,
            phone,

            loanDate,
            firstDueDate,
            maturedDate,

            loanType,
            loanPurpose,
            loanAmount,

            dues,
        } = body;

        /* ---------------- REQUIRED FIELDS ---------------- */
        if (
            !customer ||
            !scheme ||
            !employee ||
            !group ||
            !loanAmount ||
            !dues?.length
        ) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        /* ---------------- CUSTOMER VALIDATION ---------------- */
        const client = await Client.findById(customer).lean();
        if (!client)
            return NextResponse.json(
                { success: false, error: "Customer not found" },
                { status: 404 }
            );

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Customer belongs to another branch" },
                { status: 403 }
            );
        }

        /* ---------------- ACTIVE LOAN CHECK ---------------- */
        const activeLoan = await Loan.findOne({
            customer,
            status: { $in: ["PENDING", "APPROVED", "ARREAR"] },
        });

        if (activeLoan) {
            return NextResponse.json(
                { success: false, error: "Customer already has an active or pending loan" },
                { status: 400 }
            );
        }

        const targetGroupId =
            typeof group === "object" && group !== null && "_id" in group
                ? (group as { _id: string })._id
                : group;

        const branchToUse = ctx.branchObjectId || client.branch || null;

        /* ---------------- MF LOAN ID ---------------- */
        const PREFIX = "YP-";
        const lastLoan = await Loan.findOne(branchToUse ? { branch: branchToUse } : {})
            .sort({ createdAt: -1 })
            .lean() as { mfLoanId?: string };

        let nextNo = 1;
        if (lastLoan?.mfLoanId) {
            const n = parseInt(lastLoan.mfLoanId.replace(PREFIX, ""), 10);
            if (!isNaN(n)) nextNo = n + 1;
        }

        const mfLoanId = PREFIX + String(nextNo).padStart(6, "0");

        /* ---------------- CREATE LOAN ---------------- */
        const loan = await Loan.create({
            mfLoanId,
            customer,
            scheme,
            employee,
            group: targetGroupId,
            phone,

            loanDate,
            firstDueDate,
            maturedDate,

            loanType,
            loanPurpose,
            loanAmount,

            dues,
            status: "PENDING",

            branch: branchToUse,
        });

        return NextResponse.json(
            { success: true, loan },
            { status: 201 }
        );

    } catch (error) {
        console.error("Provide Loan Error:", error);
        return NextResponse.json(
            { success: false, error: "Loan creation failed" },
            { status: 500 }
        );
    }
}
