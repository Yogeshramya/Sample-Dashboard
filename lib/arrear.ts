import mongoose from "mongoose";
import Loan from "@/models/Loan";
import Group from "@/models/Group";
import ArrearLoan from "@/models/Arrear";
import { connectDB } from "@/lib/db";

const DAY_MAP: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
};

/**
 * Calculates the number of center weeks elapsed since dueStarts as of targetDate.
 */
export function calculateCenterWeekAtDate(
    group: { dueStarts?: Date | string | null },
    targetDate: Date = new Date()
): number {
    if (!group?.dueStarts) return 0;
    const start = new Date(group.dueStarts);
    if (isNaN(start.getTime())) return 0;

    const diffMs = targetDate.getTime() - start.getTime();
    if (diffMs < 0) return 0;

    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks + 1;
}

/**
 * Synchronizes ArrearLoan records with active loans in MongoDB.
 * Finds loans that have unpaid installments past their center collection day and upserts ArrearLoan records.
 * Closes ArrearLoans for loans that have caught up or are closed.
 */
export async function syncArrearLoans(branchId?: string): Promise<number> {
    await connectDB();

    const evalDate = new Date();
    // Monday = 1, ..., Saturday = 6, Sunday = 7
    const evalDayOfWeek = evalDate.getDay() === 0 ? 7 : evalDate.getDay();

    const loanQuery: Record<string, unknown> = {
        status: { $in: ["APPROVED", "ARREAR"] },
    };

    if (branchId) {
        loanQuery.branch = branchId;
    }

    const [loans, groups] = await Promise.all([
        Loan.find(loanQuery).lean(),
        Group.find(branchId ? { branch: branchId } : {}).lean(),
    ]);

    const groupMap = new Map(groups.map((g) => [String(g._id), g]));

    let syncedCount = 0;

    for (const loan of loans) {
        const dues = loan.dues || [];
        if (dues.length === 0) continue;

        const group = groupMap.get(String(loan.group));
        if (!group) continue;

        const centerWeekNo = calculateCenterWeekAtDate(group, evalDate);
        const collectionDayStr = (group.collectionDay || "").toLowerCase().trim();
        const collectionDayNum = DAY_MAP[collectionDayStr] ?? 5;
        const clampedDayNum = Math.min(Math.max(collectionDayNum, 1), 6);

        // If today's day of week has reached the collection day, expect dues up to centerWeekNo;
        // otherwise, expected dues are up to centerWeekNo - 1.
        const expectedDuesUpToWeek =
            evalDayOfWeek >= clampedDayNum ? centerWeekNo : centerWeekNo - 1;

        if (expectedDuesUpToWeek <= 0) continue;

        interface UnpaidDueInfo {
            weekNo: number;
            principalRem: number;
            interestRem: number;
            savingsRem: number;
            totalRem: number;
        }

        const unpaidDues: UnpaidDueInfo[] = [];

        for (let i = 0; i < dues.length; i++) {
            const d = dues[i];
            const dueWeek = d.weekNo || i + 1;

            if (dueWeek <= expectedDuesUpToWeek) {
                const isPaid = Boolean(d.paid);
                const hasRemaining = (d.remainingAmount ?? 0) > 0;
                const isPartial = Boolean(d.isPartial);

                if (!isPaid || isPartial || hasRemaining) {
                    const pRem = Math.max(0, (d.principal || 0) - (d.principalPaid || 0));
                    const iRem = Math.max(0, (d.interest || 0) - (d.interestPaid || 0));
                    const sRem = Math.max(0, (d.savings || 0) - (d.savingsPaid || 0));
                    const tRem =
                        d.remainingAmount !== undefined && d.remainingAmount !== null && isPartial
                            ? d.remainingAmount
                            : d.total || (d.principal || 0) + (d.interest || 0) + (d.savings || 0);

                    unpaidDues.push({
                        weekNo: dueWeek,
                        principalRem: pRem,
                        interestRem: iRem,
                        savingsRem: sRem,
                        totalRem: Math.max(0, tRem),
                    });
                }
            }
        }

        const existingArrear = await ArrearLoan.findOne({ loan: loan._id });

        // Business rule: Classify a loan as an Arrear ONLY when:
        // 1. It has unpaid dues from prior weeks (dueWeek < centerWeekNo), OR
        // 2. The borrower has missed 2 or more weeks (unpaidWeeksCount >= 2).
        // Customers with only 1 week unpaid (current week) remain categorized as Pending.
        const hasPriorWeekUnpaid = unpaidDues.some((u) => u.weekNo < centerWeekNo);
        const isArrear = hasPriorWeekUnpaid || unpaidDues.length >= 2;

        if (isArrear) {
            const minWeek = Math.min(...unpaidDues.map((u) => u.weekNo));
            const maxWeek = Math.max(...unpaidDues.map((u) => u.weekNo));

            const principal = unpaidDues.reduce((s, u) => s + u.principalRem, 0);
            const interest = unpaidDues.reduce((s, u) => s + u.interestRem, 0);
            const savings = unpaidDues.reduce((s, u) => s + u.savingsRem, 0);
            const totalAmount = unpaidDues.reduce((s, u) => s + u.totalRem, 0);

            const partialPayments = existingArrear?.partialPayments || [];
            const totalPaidOnArrear = partialPayments.reduce(
                (s: number, p: { amount?: number }) => s + (p.amount || 0),
                0
            );
            const remainingAmount = Math.max(0, totalAmount - totalPaidOnArrear);
            const status = remainingAmount <= 0 ? "CLOSED" : "OPEN";

            if (existingArrear) {
                await ArrearLoan.updateOne(
                    { _id: existingArrear._id },
                    {
                        $set: {
                            arrearFromWeek: minWeek,
                            arrearTillWeek: maxWeek,
                            principal,
                            interest,
                            savings,
                            totalAmount,
                            remainingAmount,
                            status,
                            updatedAt: new Date(),
                        },
                    }
                );
            } else {
                await ArrearLoan.create({
                    loan: loan._id,
                    mfLoanId: loan.mfLoanId,
                    group: loan.group,
                    branch: loan.branch,
                    arrearFromWeek: minWeek,
                    arrearTillWeek: maxWeek,
                    principal,
                    interest,
                    savings,
                    totalAmount,
                    remainingAmount,
                    partialPayments: [],
                    status,
                });
            }

            syncedCount++;
        } else if (existingArrear) {
            // Loan does not qualify as an arrear (e.g. up to date, or only 1 current-week pending due)
            if (existingArrear.partialPayments && existingArrear.partialPayments.length > 0) {
                // If partial payments were already made on this arrear, keep record for accounting audit but mark CLOSED
                if (existingArrear.status === "OPEN" || existingArrear.remainingAmount > 0) {
                    await ArrearLoan.updateOne(
                        { _id: existingArrear._id },
                        {
                            $set: {
                                status: "CLOSED",
                                remainingAmount: 0,
                                updatedAt: new Date(),
                            },
                        }
                    );
                }
            } else {
                // Erroneously created single-week record or no payments logged: remove to avoid inflating reports
                await ArrearLoan.deleteOne({ _id: existingArrear._id });
            }
        }
    }

    return syncedCount;
}
