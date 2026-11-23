import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import Loan from "@/models/Loan";
import { Dues } from "@/types/fund";
import mongoose from "mongoose";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

interface CloseGroupParams {
    id: string;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const id = await params;
        const groupId =
            typeof id === "string"
                ? id
                : (id as CloseGroupParams)?.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return NextResponse.json(
                { error: "Invalid group ID" },
                { status: 400 }
            );
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json(
                { error: "Group not found" },
                { status: 404 }
            );
        }

        if (!ctx.isAdmin && String(group.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's group" },
                { status: 403 }
            );
        }

        // Fetch all loans for this group
        const groupObjectId = new mongoose.Types.ObjectId(groupId);
        const loans = await Loan.find({ group: groupObjectId });

        if (!loans.length) {
            return NextResponse.json(
                { error: "No loans found in this group" },
                { status: 400 }
            );
        }

        // Check dues for every loan
        const hasPendingDues = loans.some((loan) =>
            loan.dues?.some((due: Dues) => due.paid !== true)
        );

        if (hasPendingDues) {
            return NextResponse.json(
                { error: "Some dues are still unpaid. Group cannot be closed." },
                { status: 400 }
            );
        }

        // Close the group
        await Group.findByIdAndUpdate(groupId, {
            status: "CLOSED",
            closedAt: new Date(),
        });

        // Close each loan
        await Promise.all(
            loans.map((loan) =>
                Loan.findByIdAndUpdate(loan._id, {
                    status: "CLOSED",
                })
            )
        );

        return NextResponse.json({
            success: true,
            message: "Group and loans closed successfully",
        });

    } catch (err) {
        console.error("Close Group Error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
