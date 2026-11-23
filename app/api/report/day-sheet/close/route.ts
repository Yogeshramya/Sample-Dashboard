import { connectDB } from "@/lib/db";
import CashBox from "@/models/CashBox";
import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";
import { getTodayIST } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token)
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );

        const { date, openingBalance, closingBalance, denomination } =
            await req.json();

        if (!date)
            return NextResponse.json(
                { success: false, error: "Invalid date" },
                { status: 400 }
            );

        // Permission check: Day sheet can only be closed on the current date, except by administrators
        const todayIST = getTodayIST();
        if (date !== todayIST && token.role !== "ADMINISTRATOR" && token.role !== "ACCOUNTS_HEAD") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Day sheet can only be closed on the current date. Only administrators can close previous dates.",
                },
                { status: 403 }
            );
        }

        if (!Array.isArray(denomination))
            return NextResponse.json(
                { success: false, error: "Invalid denomination" },
                { status: 400 }
            );

        // Normalize date to midnight
        const dayDate = new Date(date);
        dayDate.setUTCHours(0, 0, 0, 0);

        const branchId =
            typeof token.branch === "string"
                ? token.branch
                : token.branch?._id;

        if (!branchId)
            return NextResponse.json(
                { success: false, error: "Invalid branch" },
                { status: 400 }
            );

        const existing = await CashBox.findOne({
            date: dayDate,
            branch: branchId,
            module: { $ne: "PERSONAL" },
        });

        /* ---------------- LOGIC ---------------- */

        // Already approved → FINAL
        if (existing?.status === "APPROVED") {
            return NextResponse.json(
                { success: false, error: "Day already approved. Cannot edit." },
                { status: 400 }
            );
        }

        // Already pending → still in approval
        if (existing?.status === "PENDING") {
            return NextResponse.json(
                { success: false, error: "Day already sent for approval." },
                { status: 400 }
            );
        }

        // Check if the most recent prior day sheet is approved
        const priorCashBox = await CashBox.findOne({
            branch: branchId,
            module: { $ne: "PERSONAL" },
            date: { $lt: dayDate },
        })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        if (priorCashBox && priorCashBox.status !== "APPROVED") {
            const pDate = priorCashBox.date
                ? new Date(priorCashBox.date).toISOString().slice(0, 10)
                : "previous date";
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot close day sheet: The previous day sheet (${pDate}) is awaiting Admin Approval. It must be approved before closing this day sheet.`,
                },
                { status: 400 }
            );
        }

        const resolvedOpening = priorCashBox?.closingBalance ?? (openingBalance || 0);

        // REJECTED → ALLOW EDIT & RESEND
        if (existing?.status === "REJECTED") {
            existing.openingBalance = resolvedOpening;
            existing.closingBalance = closingBalance;
            existing.denomination = denomination;
            existing.employee = token.id;
            existing.status = "PENDING";
            existing.approvedBy = null;
            existing.approvedAt = null;
            existing.remarks = "";

            await existing.save();

            return NextResponse.json({
                success: true,
                message: "Day updated and re-sent for approval",
            });
        }

        // No record → CREATE
        await CashBox.create({
            date: dayDate,
            module: "MFI",
            openingBalance: resolvedOpening,
            closingBalance,
            denomination,
            branch: branchId,
            employee: token.id,
            status: "PENDING",
        });

        return NextResponse.json({
            success: true,
            message: "Day closed and sent for approval",
        });
    } catch (error) {
        console.error("DaySheet Close Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
