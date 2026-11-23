import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import PersonalAccount from "@/models/PersonalAccount";
import PersonalDeposit from "@/models/PersonalDeposit";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const branchQuery: Record<string, unknown> = {};
        if (ctx.branchObjectId) {
            branchQuery.branchId = ctx.branchObjectId;
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 1. Registered Savers Count
        const clientCountQuery: Record<string, unknown> = {};
        if (ctx.branchObjectId) {
            clientCountQuery.branchId = ctx.branchObjectId;
        }
        const registeredSavers = await PersonalClient.countDocuments(clientCountQuery);

        // 2. Total Accumulated Deposits
        const depositAgg = await PersonalDeposit.aggregate([
            { $match: { ...branchQuery, status: { $in: ["APPROVED", null] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalDeposits = depositAgg[0]?.total || 0;

        // 3. Monthly Inflow & Growth
        const currentMonthAgg = await PersonalDeposit.aggregate([
            {
                $match: {
                    ...branchQuery,
                    status: { $in: ["APPROVED", null] },
                    depositDate: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const monthlyInflow = currentMonthAgg[0]?.total || 0;

        const prevMonthAgg = await PersonalDeposit.aggregate([
            {
                $match: {
                    ...branchQuery,
                    status: { $in: ["APPROVED", null] },
                    depositDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const prevMonthInflow = prevMonthAgg[0]?.total || 0;

        let growthPercentage = 0;
        if (prevMonthInflow > 0) {
            growthPercentage = Math.round(((monthlyInflow - prevMonthInflow) / prevMonthInflow) * 100);
        }

        // 4. Accrued / Target Benefits on Active Accounts
        const accountQuery: Record<string, unknown> = { status: "ACTIVE" };
        if (ctx.branchObjectId) {
            accountQuery.branchId = ctx.branchObjectId;
        }
        const activeAccounts = await PersonalAccount.find(accountQuery).select("frequency benefitAmount maturityDate paidInstallments totalTargetInstallments").lean();

        const accruedBenefits = activeAccounts.reduce((sum, acc) => sum + (acc.benefitAmount || 0), 0);

        // 5. Maturing Soon Count (within next 30 days)
        const maturingSoon = activeAccounts.filter(
            (acc) => acc.maturityDate && new Date(acc.maturityDate) >= now && new Date(acc.maturityDate) <= in30Days
        ).length;

        // 6. Plan Distribution (DAILY / WEEKLY / MONTHLY)
        const totalActive = activeAccounts.length;
        const dailyCount = activeAccounts.filter((a) => a.frequency === "DAILY").length;
        const weeklyCount = activeAccounts.filter((a) => a.frequency === "WEEKLY").length;
        const monthlyCount = activeAccounts.filter((a) => a.frequency === "MONTHLY").length;

        const planDistribution = [
            {
                name: "Daily Savers",
                value: totalActive > 0 ? Math.round((dailyCount / totalActive) * 100) : 58,
                color: "#f59e0b",
            },
            {
                name: "Monthly Savers",
                value: totalActive > 0 ? Math.round((monthlyCount / totalActive) * 100) : 30,
                color: "#0f172a",
            },
            {
                name: "Weekly Savers",
                value: totalActive > 0 ? Math.round((weeklyCount / totalActive) * 100) : 12,
                color: "#10b981",
            },
        ];

        // 7. Last 6 Months Deposit Trend
        const monthsBack = 6;
        const trendLabels: { label: string; year: number; month: number }[] = [];
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            trendLabels.push({
                label: d.toLocaleString("default", { month: "short" }),
                year: d.getFullYear(),
                month: d.getMonth(),
            });
        }

        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyTrendAgg = await PersonalDeposit.aggregate([
            {
                $match: {
                    ...branchQuery,
                    status: { $in: ["APPROVED", null] },
                    depositDate: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$depositDate" },
                        month: { $month: "$depositDate" },
                    },
                    amount: { $sum: "$amount" },
                },
            },
        ]);

        const depositTrend = trendLabels.map((item) => {
            const match = monthlyTrendAgg.find(
                (m) => m._id.year === item.year && m._id.month === item.month + 1
            );
            return {
                month: item.label,
                amount: match ? match.amount : 0,
            };
        });

        return NextResponse.json({
            success: true,
            stats: {
                registeredSavers,
                totalDeposits,
                monthlyInflow,
                growthPercentage,
                accruedBenefits,
                maturingSoon,
                planDistribution,
                depositTrend,
            },
        });
    } catch (error) {
        console.error("Personal dashboard stats error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
