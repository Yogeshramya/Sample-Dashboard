import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import PersonalLoan, { IPersonalLoanDue } from "@/models/PersonalLoan";
import PersonalLoanCollection from "@/models/PersonalLoanCollection";

interface DailyEntry {
    loanId: string;
    amount: number;
    paymentMethod?: "CASH" | "UPI" | "BANK_TRANSFER";
    remarks?: string;
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const body = await req.json();
        const entries: DailyEntry[] = Array.isArray(body.entries)
            ? body.entries
            : [
                  {
                      loanId: body.loanId,
                      amount: Number(body.amount),
                      paymentMethod: body.paymentMethod || "CASH",
                      remarks: body.remarks || "",
                  },
              ];

        if (!entries.length) {
            return NextResponse.json(
                { success: false, error: "No collection entries provided" },
                { status: 400 }
            );
        }

        const date = new Date();
        const yMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

        // Get last receipt sequence number
        const lastReceipt = await PersonalLoanCollection.findOne({
            receiptNo: new RegExp(`^PLR-${yMonth}-`),
        })
            .sort({ createdAt: -1 })
            .select("receiptNo")
            .lean();

        let nextSeq = 1;
        if (lastReceipt?.receiptNo) {
            const parts = lastReceipt.receiptNo.split("-");
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            if (!isNaN(parsed)) {
                nextSeq = parsed + 1;
            }
        }

        const createdCollections = [];
        const updatedLoans = [];

        for (const entry of entries) {
            const colAmount = Number(entry.amount);
            if (!colAmount || colAmount <= 0) continue;

            const loan = await PersonalLoan.findById(entry.loanId);
            if (!loan) continue;

            if (!ctx.isAdmin && String(loan.branchId) !== ctx.branchId) {
                continue;
            }

            // Distribute collection amount across unpaid dues
            let remainingToAllocate = colAmount;
            let principalCollected = 0;
            let interestCollected = 0;
            let lastInstallmentNo = 1;

            for (const due of loan.dues as IPersonalLoanDue[]) {
                if (remainingToAllocate <= 0) break;
                if (due.isPaid) continue;

                lastInstallmentNo = due.installmentNo;
                const dueRemaining = due.remainingAmount || due.totalDue - (due.paidAmount || 0);

                if (remainingToAllocate >= dueRemaining) {
                    // Fully pays this due
                    const pDue = due.principalAmount - (due.principalPaid || 0);
                    const iDue = due.interestAmount - (due.interestPaid || 0);

                    due.principalPaid = (due.principalPaid || 0) + pDue;
                    due.interestPaid = (due.interestPaid || 0) + iDue;
                    due.paidAmount = due.totalDue;
                    due.remainingAmount = 0;
                    due.isPaid = true;
                    due.paidAt = new Date();
                    due.status = "PAID";

                    principalCollected += pDue;
                    interestCollected += iDue;
                    remainingToAllocate -= dueRemaining;
                } else {
                    // Partially pays this due
                    // Split proportionally based on due's principal/interest ratio
                    const totalD = due.totalDue || 1;
                    const pRatio = due.principalAmount / totalD;
                    const pPortion = Math.round(remainingToAllocate * pRatio * 100) / 100;
                    const iPortion = Math.round((remainingToAllocate - pPortion) * 100) / 100;

                    due.principalPaid = (due.principalPaid || 0) + pPortion;
                    due.interestPaid = (due.interestPaid || 0) + iPortion;
                    due.paidAmount = (due.paidAmount || 0) + remainingToAllocate;
                    due.remainingAmount = Math.max(0, due.totalDue - due.paidAmount);
                    due.status = "PARTIAL";

                    principalCollected += pPortion;
                    interestCollected += iPortion;
                    remainingToAllocate = 0;
                }
            }

            // If any leftover amount beyond scheduled dues, apply straight to principal outstanding
            if (remainingToAllocate > 0) {
                principalCollected += remainingToAllocate;
                remainingToAllocate = 0;
            }

            // Update loan running balances
            loan.totalPrincipalRepaid = (loan.totalPrincipalRepaid || 0) + principalCollected;
            loan.totalInterestRepaid = (loan.totalInterestRepaid || 0) + interestCollected;
            loan.principalOutstanding = Math.max(0, loan.principalOutstanding - principalCollected);
            loan.interestOutstanding = Math.max(0, loan.interestOutstanding - interestCollected);
            loan.totalOutstanding = Math.max(0, loan.principalOutstanding + loan.interestOutstanding);

            // Check if loan is completely repaid
            const allDuesPaid = loan.dues.every((d: IPersonalLoanDue) => d.isPaid);
            if (loan.totalOutstanding <= 0 || allDuesPaid) {
                loan.status = "CLOSED";
                loan.closedAt = new Date();
                loan.closedBy = ctx.userId as unknown as typeof loan.closedBy;
                loan.closureType = "NORMAL";
                loan.nocIssued = true;
                loan.nocIssuedAt = new Date();
            }

            await loan.save();

            // Create collection receipt
            const receiptNo = `PLR-${yMonth}-${String(nextSeq++).padStart(4, "0")}`;
            const collection = await PersonalLoanCollection.create({
                receiptNo,
                loan: loan._id,
                customer: loan.customer,
                personalAccount: loan.personalAccount,
                branchId: loan.branchId,
                collectedBy: ctx.userId,
                installmentNo: lastInstallmentNo,
                collectionType: "DAILY",
                totalAmount: colAmount,
                principalPortion: principalCollected,
                interestPortion: interestCollected,
                penaltyPortion: 0,
                paymentMethod: entry.paymentMethod || "CASH",
                transactionDate: new Date(),
                remarks: entry.remarks || "Daily installment collection",
                status: "APPROVED",
                approvedBy: ctx.userId,
                approvedAt: new Date(),
            });

            createdCollections.push(collection);
            updatedLoans.push(loan);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed ${createdCollections.length} daily collection(s)`,
            count: createdCollections.length,
            collections: createdCollections,
        });
    } catch (error) {
        console.error("Daily personal loan collection error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record daily collection" },
            { status: 500 }
        );
    }
}

