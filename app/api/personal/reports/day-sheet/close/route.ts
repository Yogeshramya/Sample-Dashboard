import { connectDB } from "@/lib/db";
import CashBox from "@/models/CashBox";
import DaySheetDraft from "@/models/DaySheetDraft";
import mongoose from "mongoose";
import { NextResponse, NextRequest } from "next/server";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { date, openingBalance, closingBalance, denomination, branchId: bodyBranchId } = await req.json();

        if (!date) {
            return NextResponse.json(
                { success: false, error: "Invalid date" },
                { status: 400 }
            );
        }

        const targetBranch = (ctx.isAdmin && bodyBranchId && mongoose.Types.ObjectId.isValid(bodyBranchId))
            ? new mongoose.Types.ObjectId(bodyBranchId)
            : ctx.branchObjectId;

        if (!targetBranch) {
            return NextResponse.json(
                { success: false, error: "Invalid branch" },
                { status: 400 }
            );
        }

        // Permission check: Day sheet can only be closed on the current date, except by administrators
        const todayIST = getTodayIST();
        if (date !== todayIST && !ctx.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Day sheet can only be closed on the current date. Only administrators can close previous dates.",
                },
                { status: 403 }
            );
        }

        if (!Array.isArray(denomination)) {
            return NextResponse.json(
                { success: false, error: "Invalid denomination" },
                { status: 400 }
            );
        }

        const dateStr = typeof date === "string" ? date.slice(0, 10) : todayIST;
        const startOfDay = parseISTDate(dateStr, false);
        const endOfDay = parseISTDate(dateStr, true);

        // Normalize date to midnight UTC as well as IST start
        const dayDate = new Date(dateStr);
        dayDate.setUTCHours(0, 0, 0, 0);

        // Check if cashbox exists for this date and branch for PERSONAL
        const existing = await CashBox.findOne({
            branch: targetBranch,
            module: "PERSONAL",
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { date: dayDate },
            ],
        });

        if (existing && existing.status === "APPROVED") {
            return NextResponse.json(
                { success: false, error: "Day sheet for this date is already approved and locked" },
                { status: 400 }
            );
        }

        // 1. Enforce that the previous day sheet MUST be APPROVED
        const priorCashBox = await CashBox.findOne({
            branch: targetBranch,
            module: "PERSONAL",
            date: { $lt: startOfDay },
        })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        if (priorCashBox && priorCashBox.status !== "APPROVED") {
            const pDate = new Date(priorCashBox.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot close day sheet: The previous day sheet (${pDate}) is ${priorCashBox.status === "PENDING" ? "awaiting Admin Approval" : priorCashBox.status}. It must be approved by the administrator before closing this day sheet.`,
                },
                { status: 400 }
            );
        }

        // 2. Resolve opening balance: carry forward the last approved closed date's closing balance
        let resolvedOpeningBalance = Number(openingBalance) || 0;
        if (resolvedOpeningBalance === 0 && priorCashBox && priorCashBox.status === "APPROVED") {
            resolvedOpeningBalance = priorCashBox.closingBalance || 0;
        }

        // If exists and pending or rejected, update it and re-submit as PENDING
        if (existing) {
            existing.openingBalance = resolvedOpeningBalance;
            existing.closingBalance = Number(closingBalance) || 0;
            existing.denomination = denomination;
            existing.status = "PENDING";
            existing.employee = ctx.userId as unknown as typeof existing.employee;
            existing.closedBy = ctx.userId as unknown as typeof existing.closedBy;
            existing.closedAt = new Date();
            await existing.save();

            // Clean up draft if exists
            await DaySheetDraft.deleteOne({
                date: dateStr,
                branch: targetBranch,
                module: "PERSONAL",
            }).catch(() => {});

            return NextResponse.json({
                success: true,
                message: "Savings day sheet closed and submitted for approval",
                cashBox: existing,
            });
        }

        // Create new cashbox record
        const newCashBox = new CashBox({
            branch: targetBranch,
            module: "PERSONAL",
            date: dayDate,
            openingBalance: resolvedOpeningBalance,
            closingBalance: Number(closingBalance) || 0,
            denomination,
            status: "PENDING",
            employee: ctx.userId,
            closedBy: ctx.userId,
            closedAt: new Date(),
        });

        await newCashBox.save();

        // Clean up draft if exists
        await DaySheetDraft.deleteOne({
            date: dateStr,
            branch: targetBranch,
            module: "PERSONAL",
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: "Savings day sheet closed and submitted for approval",
            cashBox: newCashBox,
        });
    } catch (error) {
        console.error("Personal Day Sheet Close Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to close day sheet" },
            { status: 500 }
        );
    }
}
