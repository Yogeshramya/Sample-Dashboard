import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";
import Loan from "@/models/Loan";
import Credit from "@/models/Credit";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate the user
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Resolve branch
        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        // 3. Parse the request body
        const body = await req.json();
        const { arrearLoanId, amount, mode = "Cash" } = body;

        if (
            typeof arrearLoanId !== "string" ||
            !arrearLoanId.trim() ||
            typeof amount !== "number" ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            typeof mode !== "string" ||
            !["Cash", "UPI", "Bank Transfer", "Cheque"].includes(mode)
        ) {
            return NextResponse.json(
                { error: "Invalid payment data" },
                { status: 400 }
            );
        }

        // 4. Connect to the database
        await connectDB();

        // 5. Find the arrear
        const query: Record<string, unknown> = { _id: arrearLoanId };
        if (branchId) {
            query.branch = branchId;
        }

        const arrear = await ArrearLoan.findOne(query);

        if (!arrear) {
            return NextResponse.json(
                { error: "Arrear loan not found" },
                { status: 404 }
            );
        }

        if (arrear.status === "CLOSED" || arrear.remainingAmount <= 0) {
            return NextResponse.json(
                { error: "This arrear loan is already closed" },
                { status: 400 }
            );
        }

        // 6. Prevent overpayment
        const remainingAmount = Number(arrear.remainingAmount);

        if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
            return NextResponse.json(
                { error: "Invalid arrear balance" },
                { status: 400 }
            );
        }

        if (amount > remainingAmount) {
            return NextResponse.json(
                {
                    error: `Payment exceeds remaining amount (₹${remainingAmount})`,
                },
                { status: 400 }
            );
        }

        // 7. Calculate the remaining balance
        const newRemainingAmount = Math.max(
            0,
            Number((remainingAmount - amount).toFixed(2))
        );

        // 8. Record the payment in ArrearLoan
        arrear.partialPayments.push({
            amount,
            paidAt: new Date(),
            collectedBy: token.id,
        });

        arrear.remainingAmount = newRemainingAmount;

        if (newRemainingAmount === 0) {
            arrear.status = "CLOSED";
        }

        await arrear.save();

        // 9. Update the underlying Loan's dues
        try {
            const loan = await Loan.findById(arrear.loan);
            if (loan && Array.isArray(loan.dues)) {
                let remainingPayment = amount;

                for (let i = 0; i < loan.dues.length && remainingPayment > 0; i++) {
                    const due = loan.dues[i];
                    if (!due.paid || due.isPartial || (due.remainingAmount && due.remainingAmount > 0)) {
                        const dueTotal = due.total || (due.principal || 0) + (due.interest || 0) + (due.savings || 0);
                        const currentPaid = due.paidAmount || 0;
                        const dueRemaining = due.remainingAmount !== undefined && due.remainingAmount !== null && due.isPartial
                            ? due.remainingAmount
                            : Math.max(0, dueTotal - currentPaid);

                        if (dueRemaining > 0) {
                            const payTowardDue = Math.min(remainingPayment, dueRemaining);
                            due.paidAmount = (due.paidAmount || 0) + payTowardDue;
                            const newDueRemaining = dueRemaining - payTowardDue;
                            due.remainingAmount = newDueRemaining;

                            if (newDueRemaining <= 0) {
                                due.paid = true;
                                due.isPartial = false;
                                due.paidAt = new Date();
                            } else {
                                due.isPartial = true;
                            }

                            remainingPayment -= payTowardDue;
                        }
                    }
                }

                // If all dues are paid, mark loan as REPAID
                const allPaid = loan.dues.every((d: { paid?: boolean }) => d.paid);
                if (allPaid) {
                    loan.status = "REPAID";
                }

                await loan.save();
            }
        } catch (loanErr) {
            console.error("Warning: could not update underlying loan dues:", loanErr);
        }

        // 10. Create the credit/transaction entry
        await Credit.create({
            date: new Date(),
            title: "Arrear Payment",
            details: `Arrear payment for Loan ${arrear.mfLoanId} (Weeks ${arrear.arrearFromWeek}–${arrear.arrearTillWeek})`,
            amount,
            mode,
            status: "APPROVED",
            approvedBy: token.id,
            approvedAt: new Date(),
            branch: arrear.branch || branchId,
            employee: token.id,
        });

        // 11. Return response
        return NextResponse.json({
            success: true,
            message:
                newRemainingAmount === 0
                    ? "Arrear fully paid and closed successfully"
                    : "Arrear payment recorded successfully",
            arrear,
        });
    } catch (err) {
        console.error("Arrear payment error:", err);

        return NextResponse.json(
            { error: "Failed to process arrear payment" },
            { status: 500 }
        );
    }
}
