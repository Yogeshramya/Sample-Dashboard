"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
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
    Cell,
} from "recharts";
import {
    PiggyBank,
    Users,
    Wallet,
    CalendarCheck,
    Award,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    UserPlus,
    Receipt,
    Layers,
    Sparkles,
    CheckCircle2,
    Calculator,
    ArrowRightLeft,
    Clock,
    Scale,
    ClipboardCheck,
    FileSpreadsheet,
    Briefcase,
    ShieldCheck,
    Building2,
    Database,
    Headphones,
    FileCheck,
    BarChart3,
    Banknote,
    Coins,
    AlertTriangle,
} from "lucide-react";
import LoadingOverlay from "@/components/Loading";
import { PlanFrequency, SavingsMaturityCalculation } from "@/types/personal";
import { calculatePersonalSchemeValues } from "@/lib/personalSchemeCalc";

interface CustomUser {
    name?: string | null;
    email?: string | null;
    branch?: {
        name?: string;
    } | null;
    activeBranch?: {
        name?: string;
    } | null;
}

export default function PersonalSavingsDashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    // Frequency filter for scheme cards: DAILY | WEEKLY | MONTHLY
    const [activeTab, setActiveTab] = useState<PlanFrequency>("DAILY");

    // Dynamic Calculator inputs
    const [calcFreq, setCalcFreq] = useState<PlanFrequency>("DAILY");
    const [calcAmount, setCalcAmount] = useState<number>(100);
    const [calcBenefitMonths, setCalcBenefitMonths] = useState<number>(2);

    // Dynamic live KPI metrics & analytics from backend
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState({
        registeredSavers: 0,
        totalDeposits: 0,
        monthlyInflow: 0,
        growthPercentage: 0,
        accruedBenefits: 0,
        maturingSoon: 0,
        // Personal Loan Portfolio Stats
        totalOutstanding: 0,
        activeLoansCount: 0,
        totalDisbursed: 0,
        totalPrincipalRepaid: 0,
        pendingApprovalCount: 0,
        planDistribution: [
            { name: "Daily Savers", value: 58, color: "#241E4E" },
            { name: "Monthly Savers", value: 30, color: "#7C5CFC" },
            { name: "Weekly Savers", value: 12, color: "#A78BFA" },
        ],
        depositTrend: [
            { month: "May", amount: 0 },
            { month: "Jun", amount: 0 },
            { month: "Jul", amount: 0 },
            { month: "Aug", amount: 0 },
            { month: "Sep", amount: 0 },
            { month: "Oct", amount: 0 },
        ],
    });

    const formatCurrency = (val: number) => {
        return `₹ ${Number(val || 0).toLocaleString("en-IN")}`;
    };

    useEffect(() => {
        async function fetchInitialStats() {
            try {
                const [statsRes, loanRes] = await Promise.all([
                    fetch("/api/personal/dashboard-stats"),
                    fetch("/api/personal/loans"),
                ]);

                const data = await statsRes.json();
                let loanStats = {};
                try {
                    const loanData = await loanRes.json();
                    if (loanData.success && loanData.stats) {
                        loanStats = loanData.stats;
                    }
                } catch (e) {
                    console.error("Failed to load loan stats:", e);
                }

                if (data.success && data.stats) {
                    setStats((prev) => ({
                        ...prev,
                        ...data.stats,
                        ...loanStats,
                        planDistribution: data.stats.planDistribution?.length
                            ? data.stats.planDistribution
                            : prev.planDistribution,
                        depositTrend: data.stats.depositTrend?.length
                            ? data.stats.depositTrend
                            : prev.depositTrend,
                    }));
                } else if (Object.keys(loanStats).length > 0) {
                    setStats((prev) => ({
                        ...prev,
                        ...loanStats,
                    }));
                }
            } catch (err) {
                console.error("Failed to load savings dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInitialStats();
    }, []);

    // Calculator formula logic: 12 Months Collection + Custom Benefit Months = Maturity
    const calculateMaturity = (amount: number, freq: PlanFrequency, benefitMonths: number): SavingsMaturityCalculation => {
        const res = calculatePersonalSchemeValues({
            frequency: freq,
            installmentAmount: amount,
            durationMonths: 12,
            benefitMonths,
        });
        return {
            contribution: res.totalContribution,
            benefit: res.benefitAmount,
            maturity: res.maturityAmount,
        };
    };

    const dynamicCalc = calculateMaturity(calcAmount || 0, calcFreq, calcBenefitMonths);

    // Flyer standard tables
    const dailyPresets = [
        { daily: 100, contribution: 36000, benefit: 6000, maturity: 42000 },
        { daily: 200, contribution: 72000, benefit: 12000, maturity: 84000 },
        { daily: 300, contribution: 108000, benefit: 18000, maturity: 126000 },
        { daily: 400, contribution: 144000, benefit: 24000, maturity: 168000 },
        { daily: 500, contribution: 180000, benefit: 30000, maturity: 210000 },
    ];

    const monthlyPresets = [
        { monthly: 1000, contribution: 12000, benefit: 2000, maturity: 14000 },
        { monthly: 2000, contribution: 24000, benefit: 4000, maturity: 28000 },
        { monthly: 3000, contribution: 36000, benefit: 6000, maturity: 42000 },
        { monthly: 4000, contribution: 48000, benefit: 8000, maturity: 56000 },
        { monthly: 5000, contribution: 60000, benefit: 10000, maturity: 70000 },
    ];

    const weeklyPresets = [
        { weekly: 250, contribution: 13000, benefit: 2167, maturity: 15167 },
        { weekly: 500, contribution: 26000, benefit: 4333, maturity: 30333 },
        { weekly: 1000, contribution: 52000, benefit: 8667, maturity: 60667 },
        { weekly: 2000, contribution: 104000, benefit: 17333, maturity: 121333 },
        { weekly: 2500, contribution: 130000, benefit: 21667, maturity: 151667 },
    ];

    const switchToMfi = () => {
        localStorage.setItem("loanModule", "MFI");
        window.dispatchEvent(new Event("loanModuleChange"));
        router.push("/dashboard");
    };

    if (!session) {
        return <LoadingOverlay show={true} />;
    }

    const userBranch = (session.user as CustomUser)?.activeBranch || (session.user as CustomUser)?.branch;

    return (
        <div className="min-h-screen bg-[#F4F5FA] space-y-8 pb-12">
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
            >
                {/* 1. LUXURY GREEN & GOLD HERO BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C173D] via-[#241E4E] to-[#1C173D] border border-[#7C5CFC]/30 p-6 md:p-10 shadow-2xl text-white">
                    {/* Background gold glow */}
                    <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-[#7C5CFC]/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Left Info Column */}
                        <div className="space-y-3 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black tracking-widest uppercase text-[#7C5CFC]">
                                    WELCOME BACK,
                                </span>
                                {userBranch?.name && (
                                    <span className="px-3 py-0.5 rounded-full border border-[#7C5CFC]/50 text-[#7C5CFC] bg-[#7C5CFC]/10 text-xs font-bold tracking-wide">
                                        {userBranch.name}
                                    </span>
                                )}
                            </div>

                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                                    {session.user?.name || "Admin"}
                                </h1>
                                <p className="text-base md:text-xl font-bold text-purple-100/90 mt-1">
                                    Sample Small Finance Pvt Ltd
                                </p>
                                <p className="text-xs md:text-sm text-[#7C5CFC]/90 font-medium tracking-wide mt-0.5">
                                    Smart Savings Plan &bull; Gold Loan &bull; Micro Finance &bull; Investment Services
                                </p>
                            </div>

                            <p className="text-xs md:text-sm text-purple-200/80 leading-relaxed max-w-xl pt-1">
                                12 Months Guaranteed Installment Collection + Company Bonus Addition at maturity.
                            </p>

                            <div className="pt-2 flex flex-wrap items-left gap-3">
                                <button
                                    onClick={switchToMfi}
                                    className="px-4 py-2.5 rounded-xl bg-[#1C173D] hover:bg-[#1C173D] text-[#7C5CFC] font-semibold text-xs border border-[#7C5CFC]/40 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                                >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    Switch to MFI
                                </button>
                            </div>
                        </div>

                        {/* Right Slogan & Gold Icon Graphic */}
                        <div className="hidden lg:flex flex-col items-end justify-center text-right pr-4">
                            <span className="font-serif italic text-3xl xl:text-4xl font-black text-[#7C5CFC] drop-shadow-md">
                                Save Today
                            </span>
                            <span className="font-serif italic text-3xl xl:text-4xl font-black text-white drop-shadow-md">
                                Grow Tomorrow
                            </span>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#7C5CFC] bg-[#2F2864] px-3.5 py-1.5 rounded-full border border-[#7C5CFC]/30">
                                <Sparkles className="w-4 h-4 text-[#7C5CFC]" />
                                Guaranteed Wealth Creation
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. ALTERNATING GREEN & GOLD KPI METRICS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {/* Card 1: Registered Savers (DEEP GREEN) */}
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 shadow-md flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.01]">
                        <div>
                            <p className="text-xs font-bold text-purple-200/90 uppercase tracking-wider">
                                Registered Savers
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                                {loading ? "..." : stats.registeredSavers.toLocaleString("en-IN")}
                            </h3>
                            <p className="text-xs font-semibold text-[#7C5CFC] mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" /> &uarr; 12% vs last month
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-[#7C5CFC]/30 flex items-center justify-center text-[#7C5CFC] shrink-0 shadow-inner">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 2: Total Deposits (WARM GOLD) */}
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC]/40 shadow-lg flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.01]">
                        <div>
                            <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                                Total Deposits
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                                {loading ? "..." : `₹ ${stats.totalDeposits.toLocaleString("en-IN")}`}
                            </h3>
                            <p className="text-xs font-bold text-white/90 mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" /> &uarr; 18% vs last month
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 3: Monthly Inflow (DEEP GREEN) */}
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 shadow-md flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.01]">
                        <div>
                            <p className="text-xs font-bold text-purple-200/90 uppercase tracking-wider">
                                Monthly Inflow
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                                {loading ? "..." : `₹ ${stats.monthlyInflow.toLocaleString("en-IN")}`}
                            </h3>
                            <p className="text-xs font-semibold text-[#7C5CFC] mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" /> &uarr; 15% vs last month
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-[#7C5CFC]/30 flex items-center justify-center text-[#7C5CFC] shrink-0 shadow-inner">
                            <CalendarCheck className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 4: Accrued Benefits (WARM GOLD) */}
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC]/40 shadow-lg flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.01]">
                        <div>
                            <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                                Accrued Benefits
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                                {loading ? "..." : `₹ ${stats.accruedBenefits.toLocaleString("en-IN")}`}
                            </h3>
                            <p className="text-xs font-bold text-white/90 mt-1 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" /> &uarr; 22% vs last month
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 5: Maturing Soon (DEEP GREEN) */}
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 shadow-md flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.01]">
                        <div>
                            <p className="text-xs font-bold text-purple-200/90 uppercase tracking-wider">
                                Maturing Soon
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                                {loading ? "..." : stats.maturingSoon.toLocaleString("en-IN")}
                            </h3>
                            <p className="text-xs font-semibold text-[#7C5CFC] mt-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Next 30 Days
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-[#7C5CFC]/30 flex items-center justify-center text-[#7C5CFC] shrink-0 shadow-inner">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* PERSONAL LOANS KPI STATS */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-lg text-[#241E4E] flex items-center gap-2">
                                <Coins className="w-5 h-5 text-[#7C5CFC]" />
                                Personal Loan Facility
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Portfolio exposure, disbursements, recoveries &amp; approval pipeline
                            </p>
                        </div>
                    </div>

                    {/* KPI STATS CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Active Portfolio</span>
                                    <div className="p-2 rounded-xl bg-[#EDE9FE] text-[#7C5CFC]">
                                        <Banknote className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                                    {formatCurrency(stats?.totalOutstanding || 0)}
                                </div>
                                <p className="text-[11px] font-semibold text-[#7C5CFC] mt-1">
                                    {stats?.activeLoansCount || 0} active running loans
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Disbursed</span>
                                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                        <Coins className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                                    {formatCurrency(stats?.totalDisbursed || 0)}
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                    Cumulative cash &amp; bank disbursements
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Recovered</span>
                                    <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                        <Scale className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                                    {formatCurrency(stats?.totalPrincipalRepaid || 0)}
                                </div>
                                <p className="text-[11px] font-semibold text-blue-700 mt-1">
                                    Principal repayments received
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Pending Review</span>
                                    <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-xl md:text-2xl font-black text-rose-600 mt-2">
                                    {stats?.pendingApprovalCount || 0}
                                </div>
                                <p className="text-[11px] font-semibold text-rose-600 mt-1">
                                    Awaiting verification / approval
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 3. QUICK ACTIONS GRID (From Reference Image) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#241E4E] text-[#7C5CFC] flex items-center justify-center text-xs font-black border border-[#7C5CFC]/40">
                            ★
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-[#241E4E] tracking-tight">
                            Quick Actions
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            {
                                label: "New Customer Registration",
                                icon: UserPlus,
                                route: "/dashboard/personal/client/new",
                            },
                            {
                                label: "Receive Deposit",
                                icon: Receipt,
                                route: "/dashboard/personal/bill",
                            },
                            {
                                label: "New Savings Plan",
                                icon: PiggyBank,
                                route: "/dashboard/personal/scheme/new",
                            },
                            {
                                label: "Process Maturity",
                                icon: Award,
                                route: "/dashboard/personal/report/settlement",
                            },
                            {
                                label: "Refund Request",
                                icon: ArrowRightLeft,
                                route: "/dashboard/personal/client/noc",
                            },
                            {
                                label: "Generate Reports",
                                icon: BarChart3,
                                route: "/dashboard/personal/report",
                            },
                        ].map((action, i) => (
                            <div
                                key={i}
                                onClick={() => router.push(action.route)}
                                className="group p-4 bg-white border border-[#E8E7F0] hover:border-[#7C5CFC] rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10"
                            >
                                <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#241E4E] to-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-[#7C5CFC] group-hover:text-slate-950 transition-all duration-300 mb-2.5">
                                    <action.icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 group-hover:text-[#241E4E] transition-colors leading-tight">
                                    {action.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>


                {/* 4. CHARTS ROW: COLLECTION OVERVIEW & PLAN DISTRIBUTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Collection Overview Area Chart */}
                    <Card className="col-span-1 lg:col-span-2 bg-white border border-[#E8E7F0] shadow-md rounded-3xl p-6 flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-lg text-[#241E4E] flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-[#7C5CFC]" />
                                    Collection Overview
                                </h3>
                                <p className="text-xs text-slate-500">Cumulative deposit inflow trend across months</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C5CFC] bg-[#EDE9FE] px-2.5 py-1 rounded-full border border-[#DDD6FE]">
                                    <span className="w-2 h-2 rounded-full bg-[#7C5CFC]" />
                                    Monthly Trend
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-64 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.depositTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="personalPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#241E4E", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#241E4E",
                                            border: "1px solid #7C5CFC",
                                            borderRadius: "12px",
                                            color: "#f8fafc",
                                            fontWeight: 700,
                                        }}
                                        formatter={(v) => `₹ ${Number(v || 0).toLocaleString("en-IN")}`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#7C5CFC"
                                        strokeWidth={3}
                                        fill="url(#personalPurpleGradient)"
                                        dot={{ r: 4, fill: "#241E4E", stroke: "#7C5CFC", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "#7C5CFC", stroke: "#241E4E", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Savings Plan Distribution Donut Chart */}
                    <Card className="col-span-1 bg-white border border-[#E8E7F0] shadow-md rounded-3xl p-6 flex flex-col justify-between">
                        <div className="pb-3 border-b border-slate-100">
                            <h3 className="font-black text-lg text-[#241E4E] flex items-center gap-2">
                                <PiggyBank className="w-5 h-5 text-[#7C5CFC]" />
                                Savings Plan Distribution
                            </h3>
                            <p className="text-xs text-slate-500">Distribution by subscriber plan preference</p>
                        </div>

                        <div className="flex-1 flex items-center justify-center min-h-48 relative">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={stats.planDistribution}
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {stats.planDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? "#241E4E" : index === 1 ? "#7C5CFC" : "#A78BFA")} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: "#241E4E",
                                            border: "1px solid #7C5CFC",
                                            borderRadius: "10px",
                                            color: "#fff",
                                            fontWeight: 700,
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-[#241E4E]">{stats.registeredSavers}</span>
                                <span className="text-[10px] font-bold text-[#7C5CFC]">Savers</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                            {stats.planDistribution.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-semibold text-slate-700">{item.name}</span>
                                    </div>
                                    <span className="font-black text-[#241E4E]">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* 5. FLYER SPECIFICATION TABLE: 12 + 2 MONTHS BENEFIT */}
                <Card className="bg-white border border-[#7C5CFC]/30 shadow-md rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#241E4E]/5 via-[#7C5CFC]/10 to-transparent">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-[#7C5CFC]" />
                                <h2 className="text-lg md:text-xl font-black text-[#241E4E]">
                                    Official Savings Tiers & Maturity Matrix
                                </h2>
                            </div>
                            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                                Select a collection frequency to view the verified payout breakdown.
                            </p>
                        </div>

                        {/* Frequency Switch Tabs */}
                        <div className="flex bg-[#241E4E]/10 p-1 rounded-xl self-start md:self-auto border border-[#7C5CFC]/20">
                            {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === tab
                                        ? "bg-[#241E4E] text-[#7C5CFC] shadow-sm"
                                        : "text-slate-700 hover:text-[#241E4E]"
                                        }`}
                                >
                                    {tab === "DAILY" ? "Daily (30d = 1mo)" : tab === "WEEKLY" ? "Weekly" : "Monthly (12mo)"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#241E4E] text-[#7C5CFC] uppercase text-xs tracking-wider">
                                    <th className="py-3 px-4 text-left rounded-l-xl font-bold">
                                        {activeTab === "DAILY" ? "Daily Contribution" : activeTab === "WEEKLY" ? "Weekly Contribution" : "Monthly Contribution"}
                                    </th>
                                    <th className="py-3 px-4 text-right font-bold text-white">12 Months Total Deposited</th>
                                    <th className="py-3 px-4 text-right font-bold text-purple-200">2 Months Benefit (Bonus)</th>
                                    <th className="py-3 px-4 text-right rounded-r-xl font-bold text-[#7C5CFC]">Maturity Amount (Total Payout)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === "DAILY" &&
                                    dailyPresets.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#EDE9FE]/40 transition-colors">
                                            <td className="py-4 px-4 font-black text-slate-900 text-base">
                                                ₹ {row.daily.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ day</span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-semibold text-slate-700">
                                                ₹ {row.contribution.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-[#7C5CFC]">
                                                + ₹ {row.benefit.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-[#241E4E] text-base">
                                                ₹ {row.maturity.toLocaleString("en-IN")}
                                            </td>
                                        </tr>
                                    ))}

                                {activeTab === "MONTHLY" &&
                                    monthlyPresets.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#EDE9FE]/40 transition-colors">
                                            <td className="py-4 px-4 font-black text-slate-900 text-base">
                                                ₹ {row.monthly.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ month</span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-semibold text-slate-700">
                                                ₹ {row.contribution.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-[#7C5CFC]">
                                                + ₹ {row.benefit.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-[#241E4E] text-base">
                                                ₹ {row.maturity.toLocaleString("en-IN")}
                                            </td>
                                        </tr>
                                    ))}

                                {activeTab === "WEEKLY" &&
                                    weeklyPresets.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#EDE9FE]/40 transition-colors">
                                            <td className="py-4 px-4 font-black text-slate-900 text-base">
                                                ₹ {row.weekly.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">/ week</span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-semibold text-slate-700">
                                                ₹ {row.contribution.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-[#7C5CFC]">
                                                + ₹ {row.benefit.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-[#241E4E] text-base">
                                                ₹ {row.maturity.toLocaleString("en-IN")}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>

                        {/* Formula Banner */}
                        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#241E4E]/10 to-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[#241E4E] text-[#7C5CFC] font-bold">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#241E4E] uppercase tracking-wider">Simple Official Formula</p>
                                    <p className="text-sm font-black text-slate-900">
                                        12 Months Contribution + 2 Months Company Benefit = Full Maturity Amount
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/30">
                                ~16.67% Guaranteed Value Addition
                            </span>
                        </div>
                    </div>
                </Card>

                {/* 6. DYNAMIC MATURITY CALCULATOR */}
                <Card className="bg-white border border-[#7C5CFC]/30 shadow-md rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Calculator className="w-6 h-6 text-[#7C5CFC]" />
                        <h3 className="font-black text-xl text-[#241E4E]">Interactive Plan Calculator</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Deposit Frequency
                                </label>
                                <div className="grid grid-cols-3 gap-2 mt-1.5">
                                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setCalcFreq(f)}
                                            className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${calcFreq === f
                                                ? "bg-[#241E4E] text-[#7C5CFC] shadow-xs"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Installment Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    min={10}
                                    step={10}
                                    value={calcAmount}
                                    onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-base"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Company Benefit Bonus
                                </label>
                                <div className="grid grid-cols-3 gap-2 mt-1.5">
                                    {[2, 3, 4].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setCalcBenefitMonths(m)}
                                            className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${calcBenefitMonths === m
                                                ? "bg-[#241E4E] text-[#7C5CFC] shadow-xs ring-1 ring-[#7C5CFC]"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                        >
                                            {m} Months
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Result Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1C173D] via-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 shadow-xl space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-purple-200/90">Total 12 Months Savings:</span>
                                <span className="font-bold">₹ {dynamicCalc.contribution.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[#7C5CFC]">{calcBenefitMonths} Months Company Bonus:</span>
                                <span className="font-bold text-[#7C5CFC]">+ ₹ {dynamicCalc.benefit.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="pt-3 border-t border-[#7C5CFC]/30 flex justify-between items-center">
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Total Maturity:</span>
                                <span className="text-2xl md:text-3xl font-black text-[#7C5CFC]">
                                    ₹ {dynamicCalc.maturity.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 8. TRUST & SECURITY FOOTER RIBBON (From Reference Image) */}
                <div className="rounded-2xl p-4 md:p-6 bg-gradient-to-r from-[#1C173D] via-[#241E4E] to-[#1C173D] text-purple-100 border border-[#7C5CFC]/30 shadow-md">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-justify text-center md:text-centre">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <ShieldCheck className="w-6 h-6 text-[#7C5CFC] shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Secure &amp; Reliable</p>
                                <p className="text-[10px] text-purple-200/70">Bank-grade security</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <Building2 className="w-6 h-6 text-[#7C5CFC] shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Multi-Branch Support</p>
                                <p className="text-[10px] text-purple-200/70">Manage multiple branches</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <Database className="w-6 h-6 text-[#7C5CFC] shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Automated Backups</p>
                                <p className="text-[10px] text-purple-200/70">Data safety &amp; recovery</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.main>
        </div>
    );
}
