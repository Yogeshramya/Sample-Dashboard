"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    Users,
    Briefcase,
    Building2,
    Wallet,
    Trophy,
    AlertCircle,
    TrendingDown,
    HandCoins,
    PiggyBank,
    FileText
} from "lucide-react";
import LoadingOverlay from "@/components/Loading";

interface ROWs {
    totalInterest: number;
    overdueAmount: number;
    totalOutstanding: number;
    loanAmount: number;
    paidSavings: number;
}

export default function Dashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    const [centers, setCenters] = useState(0);
    const [employeesCount, setEmployeesCount] = useState(0);
    const [clientsCount, setClientsCount] = useState(0);

    const [, setMonthlyIncome] = useState(0);
    const [monthlyBorrowers, setMonthlyBorrowers] = useState(0);
    const [, setMonthlyExpense] = useState(0);

    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [totalSavings, setTotalSavings] = useState(0);
    const [totalDisbursement, setTotalDisbursement] = useState(0);

    // Summary data states
    const [totalInterest, setTotalInterest] = useState(0);
    const [totalOverdue, setTotalOverdue] = useState(0);

    const [arrearCount, setArrearCount] = useState<number | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const [topBranches, setTopBranches] = useState<
        { name: string; amount: number }[]
    >([]);

    const [topEmployees, setTopEmployees] = useState<
        {
            employee: string;
            loanAmount: number;
            borrowers: number;
        }[]
    >([]);

    const [leaderboardMonth, setLeaderboardMonth] = useState("");

    const [loanTrend, setLoanTrend] = useState<
        { month: string; amount: number }[]
    >([]);

    useEffect(() => {
        fetch("/api/employees/leaderboard")
            .then((r) => r.json())
            .then((d) => {
                if (d.success) {
                    setTopEmployees(d.data);
                    setLeaderboardMonth(d.month);
                }
            });
    }, []);

    /* Outstanding + Savings + Real Summary Data */
    useEffect(() => {
        async function fetchOutstanding() {
            try {
                const [outRes, draftRes] = await Promise.all([
                    fetch("/api/report/outstanding"),
                    fetch("/api/analytics/total-savings"),
                ]);

                const outData = await outRes.json();
                const draftData = await draftRes.json();

                if (outData.success && Array.isArray(outData.rows)) {
                    const totalOutstandingAmount = outData.rows.reduce(
                        (sum: number, row: ROWs) => sum + (row.totalOutstanding || 0), 0
                    );

                    const totalDisbursementAmount = outData.rows.reduce(
                        (sum: number, row: ROWs) => sum + (row.loanAmount || 0), 0
                    );

                    const paidSavingsAmount = outData.rows.reduce(
                        (sum: number, row: ROWs) => sum + (row.paidSavings || 0), 0
                    );

                    const totalInterestAmount = outData.rows.reduce(
                        (sum: number, row: ROWs) => sum + (row.totalInterest || 0), 0
                    );

                    const totalOverdueAmount = outData.rows.reduce(
                        (sum: number, row: ROWs) => sum + (row.overdueAmount || 0), 0
                    );

                    const draftSavings = draftData.success ? draftData.total || 0 : 0;

                    setTotalOutstanding(totalOutstandingAmount);
                    setTotalDisbursement(totalDisbursementAmount);
                    setTotalSavings(paidSavingsAmount + draftSavings);

                    setTotalInterest(totalInterestAmount);
                    setTotalOverdue(totalOverdueAmount);
                }
            } catch (err) {
                console.error(err);
            }
        }

        fetchOutstanding();
    }, []);

    /* Live Counts */
    useEffect(() => {
        async function fetchCounts() {
            try {
                const [g, c, e] = await Promise.all([
                    fetch("/api/group/list").then((r) => r.json()),
                    fetch("/api/clients?status=ACTIVE").then((r) => r.json()),
                    fetch("/api/employees/list").then((r) => r.json()),
                ]);

                setCenters(g.groups?.length || 0);
                setClientsCount(c?.count ?? (Array.isArray(c?.clients) ? c.clients.length : 0));
                setEmployeesCount(e.employees?.length || 0);
            } catch (err) {
                console.error(err);
            }
        }

        fetchCounts();
        const i = setInterval(() => {
            fetch("/api/fund/pending", { cache: "no-store" })
                .then((r) => r.json())
                .then((d) => d.success && setPendingCount(d.count || 0))
                .catch(() => {});
        }, 10000);
        return () => clearInterval(i);
        return () => clearInterval(i);
    }, []);

    /* Monthly */
    useEffect(() => {
        async function fetchMonthly() {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

            const income = await fetch(`/api/credit/income?month=${month}`).then((r) => r.json());
            const fund = await fetch(`/api/fund?status=ACTIVE`).then((r) => r.json());
            const expense = await fetch(`/api/debit/expense?month=${month}`).then((r) => r.json());

            setMonthlyIncome(income.grandTotal || 0);
            setMonthlyBorrowers(fund.count || 0);
            setMonthlyExpense(expense.total || 0);
        }

        fetchMonthly();
    }, []);

    /* Top Branches */
    useEffect(() => {
        fetch("/api/analytics/top-branches")
            .then((r) => r.json())
            .then((d) => d.success && setTopBranches(d.data));
    }, []);

    /* Loan Trend */
    useEffect(() => {
        fetch("/api/analytics/last-6-months")
            .then((r) => r.json())
            .then((d) => d.success && setLoanTrend(d.data));
    }, []);

    /* Arrears Count — refresh every 10 seconds */
    useEffect(() => {
        let cancelled = false;

        async function fetchArrearCount() {
            try {
                const response = await fetch(
                    "/api/report/arrear/count",
                    { cache: "no-store" }
                );

                if (!response.ok) {
                    throw new Error(
                        `Arrear count failed: ${response.status}`
                    );
                }

                const data = await response.json();
                const count = Number(data.count);

                if (
                    !data.success ||
                    !Number.isSafeInteger(count) ||
                    count < 0
                ) {
                    throw new Error("Invalid arrear count response");
                }

                if (!cancelled) {
                    setArrearCount(count);
                }
            } catch (error) {
                console.error("Dashboard arrears:", error);
            }
        }

        void fetchArrearCount();

        const interval = setInterval(
            () => void fetchArrearCount(),
            10_000
        );

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    /* Live Pending Borrowers Count */
    useEffect(() => {
        fetch("/api/fund/pending", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => {
                if (d.success) {
                    setPendingCount(d.count || 0);
                }
            })
            .catch((err) => console.error("Error fetching pending:", err));
    }, []);

    if (!session) {
        return <LoadingOverlay show={true} />;
    }

    function formatIndianAmount(value: number) {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
        return `₹${value.toLocaleString('en-IN')}`;
    }

    const stats = [
        { label: "Groups", value: centers, icon: Building2, href: "/dashboard/group" },
        { label: "Employees", value: employeesCount, icon: Briefcase, href: "/dashboard/employees" },
        { label: "Clients", value: clientsCount, icon: Users, href: "/dashboard/client" },
        { label: "Total Outstanding", value: formatIndianAmount(totalOutstanding), icon: Wallet, href: "/dashboard/report/outstanding" },
        { label: "Total Savings", value: formatIndianAmount(totalSavings), icon: PiggyBank, href: "/dashboard/report/savings" },
        { label: "Total Disbursement", value: formatIndianAmount(totalDisbursement), icon: HandCoins, href: "/dashboard/report/loan-report" },
        { label: "Borrowers", value: monthlyBorrowers, icon: Wallet, href: "/dashboard/report/loan-report" },
        { label: "Arrears", value: arrearCount ?? "—", icon: AlertCircle, href: "/dashboard/report/arrear" },
        { label: "Pending", value: pendingCount, icon: TrendingDown, href: "/dashboard/report/pending-fund" },
    ];

    const totalCollected = totalDisbursement > totalOutstanding ? totalDisbursement - totalOutstanding : 0;

    const chartTotal = totalCollected + totalOutstanding + totalOverdue;
    const getPercent = (val: number) => chartTotal > 0 ? ((val / chartTotal) * 100).toFixed(1) : "0.0";

    const pieData = [
        { name: "Collected", value: totalCollected, color: "#16a34a" },
        { name: "Outstanding", value: totalOutstanding, color: "#dc2626" },
        { name: "Overdue", value: totalOverdue, color: "#2563eb" },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="p-4 md:p-6 space-y-8"
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent tracking-tight">
                            Dashboard Overview
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">
                            Welcome back,
                            <span className="font-bold ml-1 text-[#7C5CFC]">
                                {session.user?.name}
                            </span>
                        </p>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                    {stats.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <Card
                                onClick={() => s.href && router.push(s.href)}
                                className={`bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-[#7C5CFC]/40 transition-all rounded-2xl group overflow-hidden ${
                                    s.href ? "cursor-pointer" : ""
                                }`}
                            >
                                <CardContent className="p-5 flex justify-between items-center relative">
                                    <div className="absolute inset-0 bg-linear-to-br from-transparent to-[#EDE9FE]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                                        <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                                            {s.value}
                                        </h3>
                                    </div>
                                    <div className="relative z-10 p-3 rounded-xl bg-linear-to-br from-[#241E4E] to-[#1C173D] text-[#7C5CFC] shadow-md group-hover:scale-110 transition-transform">
                                        <s.icon className="w-5 h-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Loan Summary Card */}
                    <Card className="col-span-1 bg-white shadow-lg rounded-3xl border border-slate-200 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#7C5CFC]" />
                                    Loan Summary
                                </h3>
                            </div>

                            <div className="px-6 py-4 space-y-4 border-b border-slate-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-600">Total Loans Disbursed</span>
                                    <span className="font-black text-slate-900 text-base">₹ {totalDisbursement.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-600">Total Interest</span>
                                    <span className="font-black text-slate-900 text-base">₹ {totalInterest.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-600">Total Collections</span>
                                    <span className="font-black text-slate-900 text-base">₹ {totalCollected.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 border-dashed">
                                    <span className="font-bold text-slate-800">Remaining Outstanding</span>
                                    <span className="font-black text-red-600 text-base">₹ {totalOutstanding.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Donut Chart & Legend */}
                            <div className="p-6 flex flex-col xl:flex-row items-center justify-center gap-6">
                                <div className="relative w-40 h-40">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                innerRadius={45}
                                                outerRadius={75}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex flex-col gap-4 w-full xl:w-auto flex-1">
                                    {pieData.map((item, index) => (
                                        <div key={index} className="flex flex-col">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-sm"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: item.color }}>
                                                    {getPercent(item.value)}%
                                                </span>
                                            </div>
                                            <div className="text-right text-sm font-bold text-slate-600 mt-0.5">
                                                ₹ {item.value.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Loan Trend Area Chart */}
                    <Card className="col-span-1 lg:col-span-2 bg-white shadow-lg rounded-3xl border border-slate-200 overflow-hidden">
                        <CardContent className="p-6 h-full flex flex-col">
                            <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-[#7C5CFC] transform rotate-180" />
                                Loan Disbursement Trend
                            </h3>
                            <div className="flex-1 w-full min-h-75">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={loanTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="loanGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                                            tickFormatter={(v) => `${formatIndianAmount(v)}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#0f172a",
                                                border: "1px solid #6846EB",
                                                borderRadius: "12px",
                                                color: "#f8fafc",
                                                fontWeight: 600,
                                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                            }}
                                            formatter={(v) => `₹ ${Number(v || 0).toLocaleString('en-IN')}`}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#6846EB"
                                            strokeWidth={3}
                                            fill="url(#loanGradient)"
                                            dot={{ r: 4, fill: "#ffffff", stroke: "#6846EB", strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: "#7C5CFC", stroke: "#0f172a", strokeWidth: 2 }}
                                            animationDuration={1200}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Bottom Row - Leaderboards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Branches */}
                    <Card className="bg-white shadow-lg rounded-3xl border border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg text-slate-900">Top Branches</h3>
                                <Trophy className="text-[#7C5CFC] w-5 h-5" />
                            </div>
                            <div className="space-y-3">
                                {topBranches.length ? (
                                    topBranches.map((branch, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-200 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${index === 0 ? "bg-linear-to-br from-[#7C5CFC] to-[#5835E5]" : index === 1 ? "bg-linear-to-br from-slate-400 to-gray-500" : "bg-linear-to-br from-amber-700 to-orange-800"}`}>
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{branch.name}</h4>
                                                    <p className="text-xs font-semibold text-slate-500">Branch Performance</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-lg text-slate-900">₹{branch.amount.toLocaleString('en-IN')}</p>
                                                <p className="text-xs font-semibold text-slate-500">Loan Amount</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400 font-medium">No branch data available</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Employees */}
                    <Card className="bg-white shadow-lg rounded-3xl border border-slate-200 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <Trophy className="text-[#7C5CFC] w-5 h-5" />
                                    Top Employees <span className="text-slate-400 font-medium text-sm ml-2">({leaderboardMonth})</span>
                                </h3>
                            </div>
                            <div className="p-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="py-3 px-4 text-left font-bold">Rank</th>
                                            <th className="py-3 px-4 text-left font-bold">Employee</th>
                                            <th className="py-3 px-4 text-right font-bold">Amount</th>
                                            <th className="py-3 px-4 text-right font-bold">Borrowers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topEmployees.length ? (
                                            topEmployees.map((e, i) => (
                                                <tr key={i} className="hover:bg-amber-50/50 transition-colors border-b border-slate-50 last:border-none">
                                                    <td className="py-4 px-4 font-black text-[#7C5CFC]">#{i + 1}</td>
                                                    <td className="py-4 px-4 font-bold text-slate-800">{e.employee}</td>
                                                    <td className="py-4 px-4 text-right font-black text-slate-900">₹{e.loanAmount.toLocaleString('en-IN')}</td>
                                                    <td className="py-4 px-4 text-right font-semibold text-slate-500">{e.borrowers}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                                                    No employee data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.main>
        </div>
    );
}