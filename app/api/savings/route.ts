import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsApproval from "@/models/Savings";
import Loan from "@/models/Loan";
import Client from "@/models/Client";
import Branch from "@/models/Branch";
import User from "@/models/User";
import Group from "@/models/Group";
import Scheme from "@/models/Scheme";
import { Dues } from "@/types/fund";
import { parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const customerCode = searchParams.get("customerCode")?.trim();
        const date = searchParams.get("date")?.trim();
        const from = searchParams.get("from")?.trim();
        const to = searchParams.get("to")?.trim();

        /* ================= 1. SINGLE CUSTOMER SEARCH ================= */
        if (customerCode) {
            const client = await Client.findOne({
                customerCode: { $regex: new RegExp(`^${customerCode}$`, "i") },
            })
                .populate({ path: "group", model: Group })
                .populate({ path: "branch", model: Branch })
                .lean();

            if (!client) {
                return NextResponse.json(
                    { success: false, message: "Customer not found" },
                    { status: 404 }
                );
            }

            // Branch authorization check
            if (!ctx.isAdmin) {
                const clientBranchStr = client.branch && typeof client.branch === "object"
                    ? String((client.branch as { _id?: unknown })._id)
                    : String(client.branch || "");
                if (clientBranchStr !== ctx.branchId) {
                    return NextResponse.json(
                        { success: false, message: "Customer not found" },
                        { status: 404 }
                    );
                }
            }

            // Find savings record that officially closed out the member
            const savingsRecord = await SavingsApproval.findOne({
                customer: client._id,
                status: "APPROVED",
            })
                .sort({ approvedAt: -1, createdAt: -1 })
                .populate({ path: "branch", select: "name branchCode", model: Branch })
                .populate({ path: "approvedBy", select: "name", model: User })
                .populate({ path: "requestedBy", select: "name", model: User })
                .lean();

            // Fetch the corresponding loan details
            const lastLoan = await Loan.findOne({
                $or: [{ customer: client._id }, { clientId: client._id }],
            })
                .sort({ createdAt: -1 })
                .populate({ path: "scheme", select: "schemeName", model: Scheme })
                .populate({ path: "group", select: "groupName", model: Group })
                .populate({ path: "branch", select: "name branchCode", model: Branch })
                .populate({ path: "customer", model: Client })
                .lean();

            const paidDues = lastLoan?.dues?.filter((d: Dues) => d.paid).length || 0;
            const totalDues = lastLoan?.dues?.length || 0;
            const totalCollected =
                lastLoan?.dues?.reduce(
                    (acc: number, d: Dues) => acc + (d.paid ? Number(d.total || 0) : 0),
                    0
                ) || 0;
            const totalPayable =
                lastLoan?.dues?.reduce(
                    (acc: number, d: Dues) => acc + Number(d.total || 0),
                    0
                ) || 0;

            const remainingBalance = Math.max(0, totalPayable - totalCollected);

            const isClosed =
                lastLoan?.status === "CLOSED" ||
                lastLoan?.status === "REPAID" ||
                client.status === "CLOSED" ||
                (totalDues > 0 && paidDues === totalDues) ||
                remainingBalance === 0;

            const summary = lastLoan
                ? {
                    mfLoanId: lastLoan.mfLoanId,
                    status: lastLoan.status,
                    loanAmount: lastLoan.loanAmount,
                    loanDate: lastLoan.loanDate,
                    scheme: (lastLoan.scheme as { schemeName?: string })?.schemeName || "-",
                    totalDues,
                    paidDues,
                    unpaidDues: totalDues - paidDues,
                    totalPayable,
                    totalCollected,
                    remainingBalance,
                    isNocEligible: isClosed,
                    closedAt: savingsRecord?.approvedAt || savingsRecord?.createdAt || lastLoan.approvedAt,
                    savingsRefunded: savingsRecord?.savingsAmount ? true : !!lastLoan.savingsRefunded,
                }
                : null;

            return NextResponse.json({
                success: true,
                client,
                savingsRecord,
                lastLoan,
                lastLoanSummary: summary,
            });
        }

        /* ================= 2. FILTER BY DATE OR DATE RANGE ================= */
        const filter: Record<string, unknown> = { status: "APPROVED" };
        if (ctx.branchObjectId) {
            filter.branch = ctx.branchObjectId;
        }
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        if (date) {
            minDate = new Date(
                Math.min(
                    parseISTDate(date, false).getTime(),
                    new Date(`${date}T00:00:00.000Z`).getTime()
                )
            );
            maxDate = new Date(
                Math.max(
                    parseISTDate(date, true).getTime(),
                    new Date(`${date}T23:59:59.999Z`).getTime()
                )
            );

            filter.$or = [
                { approvedAt: { $gte: minDate, $lte: maxDate } },
                { updatedAt: { $gte: minDate, $lte: maxDate } },
                { createdAt: { $gte: minDate, $lte: maxDate } },
            ];
        } else if (from && to) {
            minDate = new Date(
                Math.min(
                    parseISTDate(from, false).getTime(),
                    new Date(`${from}T00:00:00.000Z`).getTime()
                )
            );
            maxDate = new Date(
                Math.max(
                    parseISTDate(to, true).getTime(),
                    new Date(`${to}T23:59:59.999Z`).getTime()
                )
            );

            filter.$or = [
                { approvedAt: { $gte: minDate, $lte: maxDate } },
                { updatedAt: { $gte: minDate, $lte: maxDate } },
                { createdAt: { $gte: minDate, $lte: maxDate } },
            ];
        }

        const approvedSavings = await SavingsApproval.find(filter)
            .sort({ approvedAt: -1, createdAt: -1 })
            .populate({
                path: "customer",
                model: Client,
                populate: { path: "group", model: Group },
            })
            .populate({ path: "branch", select: "name branchCode", model: Branch })
            .populate({ path: "approvedBy", select: "name", model: User })
            .populate({ path: "requestedBy", select: "name", model: User })
            .lean();

        // Extract customer IDs
        const customerIds = approvedSavings
            .map((s) => s.customer?._id)
            .filter(Boolean);

        const loans = await Loan.find({
            $or: [
                { customer: { $in: customerIds } },
                { clientId: { $in: customerIds } },
            ],
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "customer",
                model: Client,
                populate: { path: "group", model: Group },
            })
            .populate({ path: "group", model: Group })
            .populate({ path: "scheme", model: Scheme })
            .populate({ path: "branch", model: Branch })
            .lean();

        // Map latest loan records to customer IDs
        const loanMap: Record<string, typeof loans[0]> = {};
        loans.forEach((loan) => {
            const custId =
                loan.customer?._id?.toString() ||
                loan.customer?.toString() ||
                (loan as { clientId?: string }).clientId?.toString();
            if (custId && !loanMap[custId]) {
                loanMap[custId] = loan;
            }
        });

        // Format closed loans array for client consumption
        const closedLoans = approvedSavings
            .map((rec) => {
                const custId = rec.customer?._id?.toString();
                const matchedLoan = custId ? loanMap[custId] : null;

                if (!matchedLoan) {
                    if (!rec.customer) return null;
                    return {
                        _id: rec._id,
                        mfLoanId: (rec.customer as { customerCode?: string })?.customerCode || "N/A",
                        loanAmount: 0,
                        status: "CLOSED",
                        customer: rec.customer,
                        branch: rec.branch,
                        group: (rec.customer as { group?: unknown })?.group,
                        closedAt: rec.approvedAt || rec.updatedAt || rec.createdAt,
                        savingsRefunded: rec.savingsAmount || 0,
                        dues: [],
                    };
                }

                return {
                    ...matchedLoan,
                    customer: rec.customer || matchedLoan.customer,
                    closedAt: rec.approvedAt || rec.updatedAt || rec.createdAt || (matchedLoan as { closedAt?: Date }).closedAt,
                    savingsRefunded: rec.savingsAmount !== undefined ? rec.savingsAmount : matchedLoan.savingsRefunded,
                };
            })
            .filter(Boolean);

        // Also check if any direct loans closed on that date were not in approvedSavings
        if (minDate && maxDate) {
            const directClosedLoans = await Loan.find({
                status: { $in: ["CLOSED", "REPAID"] },
                $or: [
                    { updatedAt: { $gte: minDate, $lte: maxDate } },
                    { approvedAt: { $gte: minDate, $lte: maxDate } },
                ],
                customer: { $nin: customerIds },
            })
                .sort({ updatedAt: -1 })
                .populate({
                    path: "customer",
                    model: Client,
                    populate: { path: "group", model: Group },
                })
                .populate({ path: "group", model: Group })
                .populate({ path: "scheme", model: Scheme })
                .populate({ path: "branch", model: Branch })
                .lean();

            for (const dLoan of directClosedLoans) {
                if (dLoan.customer) {
                    closedLoans.push({
                        ...dLoan,
                        closedAt: (dLoan as { updatedAt?: Date }).updatedAt || dLoan.approvedAt,
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: closedLoans.length,
            records: approvedSavings,
            loans: closedLoans,
        });
    } catch (error: unknown) {
        console.error("Error fetching savings closed records:", error);
        const errMessage = error instanceof Error ? error.message : "Failed to retrieve closed customer savings records";
        return NextResponse.json(
            {
                success: false,
                message: errMessage,
            },
            { status: 500 }
        );
    }
}