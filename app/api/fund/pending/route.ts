import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Group from "@/models/Group";
import Client from "@/models/Client";
import { getToken } from "next-auth/jwt";
import { Dues } from "@/types/fund";
import mongoose from "mongoose";
import { getTodayIST } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;

const DAY_MAP: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

// Calculate the center's sequence week relative to an evaluation date
function calculateCenterWeekAtDate(group: { dueStarts?: Date; dueOn?: string }, targetDate: Date): number {
    if (!group?.dueStarts) return 1;

    const start = new Date(group.dueStarts);
    start.setUTCHours(0, 0, 0, 0);

    const evalDate = new Date(targetDate);
    evalDate.setUTCHours(0, 0, 0, 0);

    if (group.dueOn === "MONTHLY") {
        let months =
            (evalDate.getFullYear() - start.getFullYear()) * 12 +
            (evalDate.getMonth() - start.getMonth());

        if (evalDate.getDate() < start.getDate()) {
            months -= 1;
        }

        return Math.max(1, months + 1);
    }

    const diffDays = Math.floor(
        (evalDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const weekNo = Math.floor(diffDays / 7) + 1;
    return weekNo < 1 ? 1 : weekNo;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        void Group;
        void Client;

        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get("groupId");
        const employeeId = searchParams.get("employeeId");
        let dateParam = searchParams.get("date"); // Optional specific evaluation date

        if (ctx.isTeller) {
            dateParam = getTodayIST();
        }

        const query: Record<string, unknown> = {
            status: { $in: ["APPROVED", "ARREAR"] },
        };

        if (ctx.branchObjectId) {
            query.branch = ctx.branchObjectId;
        }

        if (groupId) query.group = groupId;
        if (employeeId) query.employee = employeeId;

        const loans = await Loan.find(query)
            .populate({ path: "customer", select: "name phone customerCode" })
            .populate({ path: "group", select: "groupName collectionDay dueStarts dueOn" })
            .lean();

        // Target date base
        const evalDate = dateParam ? new Date(dateParam) : new Date();
        const evalDayOfWeek = evalDate.getDay(); // 0: Sun, 1: Mon ... 6: Sat

        // Calculate Monday to Friday window of the target week
        const diffToMonday = evalDayOfWeek === 0 ? -6 : 1 - evalDayOfWeek;
        const targetMonday = new Date(evalDate);
        targetMonday.setDate(evalDate.getDate() + diffToMonday);
        targetMonday.setHours(0, 0, 0, 0);

        const targetFriday = new Date(targetMonday);
        targetFriday.setDate(targetMonday.getDate() + 4);
        targetFriday.setHours(23, 59, 59, 999);

        const pendingList = loans
            .map((loan) => {
                if (!loan.dues || loan.dues.length === 0) return null;

                const groupObj = loan.group;
                const centerWeekNo = calculateCenterWeekAtDate(groupObj, evalDate);

                // Determine target collection day for this center (Mon - Fri)
                const collectionDayStr = (groupObj?.collectionDay || "").toLowerCase().trim();
                const collectionDayNum = DAY_MAP[collectionDayStr] ?? 5; // Default Friday
                const clampedDayNum = Math.min(Math.max(collectionDayNum, 1), 5);

                // Determine if the center collection day has passed in this week
                const isCollectionDayPassedOrToday = evalDayOfWeek >= clampedDayNum;

                // Expected installment index based on the center's schedule
                const expectedDuesUpToWeek = isCollectionDayPassedOrToday
                    ? centerWeekNo
                    : centerWeekNo - 1;

                if (expectedDuesUpToWeek <= 0) return null;

                const duesSorted = [...loan.dues].sort(
                    (a: Dues, b: Dues) => (a.weekNo || 0) - (b.weekNo || 0)
                );

                // Filter dues up to the expected cutoff point
                const duesExpectedSoFar = duesSorted.filter((d: Dues, index: number) => {
                    const dueWeek = d.weekNo || index + 1;
                    return dueWeek <= expectedDuesUpToWeek;
                });

                // Find unpaid or partially paid dues within the window
                const unpaidExpectedDues = duesExpectedSoFar.filter((d: Dues) => {
                    const isFullyPaid = Boolean(d.paid);
                    const hasRemaining = (d.remainingAmount ?? 0) > 0;
                    const isPartial = Boolean(d.isPartial);
                    return !isFullyPaid || isPartial || hasRemaining;
                });

                // If all installments due up to this collection day are paid, do NOT count as pending
                if (unpaidExpectedDues.length === 0) {
                    return null;
                }

                let consecutiveUnpaid = 0;
                let maxConsecutiveUnpaid = 0;

                for (const d of duesExpectedSoFar) {
                    if (!d.paid || d.isPartial) {
                        consecutiveUnpaid++;
                        maxConsecutiveUnpaid = Math.max(maxConsecutiveUnpaid, consecutiveUnpaid);
                    } else {
                        consecutiveUnpaid = 0;
                    }
                }

                const pendingAmount = unpaidExpectedDues.reduce((sum: number, d: Dues) => {
                    const dueRem =
                        d.isPartial && d.remainingAmount !== undefined && d.remainingAmount !== null
                            ? d.remainingAmount
                            : d.total || 0;
                    return sum + Math.max(0, dueRem);
                }, 0);

                if (pendingAmount <= 0) return null;

                return {
                    customerId: loan.customer?._id,
                    customerCode: (loan.customer)?.customerCode || "-",
                    customerName: loan.customer?.name || "Unknown",
                    phone: loan.customer?.phone || "-",
                    loanId: loan._id,
                    mfLoanId: loan.mfLoanId,
                    centerName: groupObj?.groupName || "Center",
                    collectionDay: groupObj?.collectionDay || "Friday",
                    centerWeekNo,
                    pendingAmount,
                    unpaidWeeks: consecutiveUnpaid,
                    arrear2Weeks: maxConsecutiveUnpaid >= 2,
                };
            })
            .filter(Boolean);

        const totalPendingAmount = pendingList.reduce(
            (sum, item) => sum + (item?.pendingAmount || 0),
            0
        );

        return NextResponse.json({
            success: true,
            weekStart: targetMonday.toISOString().slice(0, 10),
            weekEnd: targetFriday.toISOString().slice(0, 10),
            count: pendingList.length,
            totalPendingAmount,
            pending: pendingList,
        });
    } catch (error) {
        console.error("Pending API Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
