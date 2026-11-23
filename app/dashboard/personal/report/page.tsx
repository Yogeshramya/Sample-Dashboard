"use client";

import { useRouter } from "next/navigation";
import {
    CalendarCheck,
    PiggyBank,
    Award,
    ShieldCheck,
    ChevronRight,
    ArrowLeft,
    TrendingDown,
    TrendingUp,
    Scale,
    ArrowRightLeft,
    FileSpreadsheet,
    Banknote,
    Receipt,
    AlertTriangle,
    Lock,
    Coins,
    BarChart3,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function PersonalReportHubPage() {
    const router = useRouter();

    const savingsReports = [
        {
            title: "Day Accounts Summary",
            description: "Daily deposit collections, incomes, debits, and net cash balance summary.",
            icon: <CalendarCheck className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/report/day-sheet"),
        },
        {
            title: "Deposit Collections",
            description: "Date-wise and collector-wise installment collections and payment mode breakdown.",
            icon: <PiggyBank className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/report/deposit-report"),
        },
        {
            title: "Savings Settlement & Maturity",
            description: "Comprehensive registry of matured savings plans, accrued bonuses, and payouts.",
            icon: <Award className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/report/settlement-report"),
        },
        {
            title: "Closed Savings Accounts",
            description: "Historical registry of completed, settled, and pre-closed savings accounts.",
            icon: <ShieldCheck className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/report/closed-report"),
        },
        {
            title: "Expenses Report",
            description: "Category-wise disbursements, branch running costs, and approved debit registers.",
            icon: <TrendingDown className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/debit/report"),
        },
        {
            title: "Incomes Report",
            description: "Non-deposit income receipts, registration fees, and other credit registers.",
            icon: <TrendingUp className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/credit/report"),
        },
        {
            title: "Remittance Report",
            description: "Inward and outward inter-branch transfers and MFI ↔ Savings capital transfers.",
            icon: <ArrowRightLeft className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/remittance/report"),
        },
    ];

    const loanReports = [
        {
            title: "Loan Disbursement Report",
            description: "Full audit register of sanctioned personal loans, fee deductions, and net disbursements.",
            icon: <Banknote className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Outflow Register",
            action: () => router.push("/dashboard/personal/report/disbursement"),
        },
        {
            title: "Loan Collections Report",
            description: "Daily, weekly, and monthly installment collections, principal recovery, and interest.",
            icon: <Receipt className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Recovery Inflow",
            action: () => router.push("/dashboard/personal/report/collections"),
        },
        {
            title: "Loan Arrears & Dues Report",
            description: "Delinquency aging tracking missed installments, pending dues, and overdue borrowers.",
            icon: <AlertTriangle className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Delinquency Risk",
            action: () => router.push("/dashboard/personal/report/arrears"),
        },
        {
            title: "Loan Outstanding Balance Report",
            description: "Live portfolio exposure register tracking active principal, unpaid interest, and recovery index.",
            icon: <Scale className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Portfolio Exposure",
            action: () => router.push("/dashboard/personal/report/outstanding"),
        },
        {
            title: "Loan Closures & Settlements",
            description: "Audit register of maturely closed and early pre-closed loans with NOC issuance records.",
            icon: <Lock className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Settlement Audit",
            action: () => router.push("/dashboard/personal/report/closure"),
        },
        {
            title: "Master Loan Register",
            description: "Full comprehensive ledger audit suite across all loan statuses and portfolio categories.",
            icon: <BarChart3 className="w-7 h-7 text-[#7C5CFC]" />,
            badge: "Master Register",
            action: () => router.push("/dashboard/personal/report/loan-reports"),
        },
    ];

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-100 pb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E]/10 border border-[#7C5CFC]/40 text-[#241E4E] text-xs font-bold tracking-wide uppercase">
                        <FileSpreadsheet className="w-4 h-4 text-[#7C5CFC]" />
                        Financial Intelligence
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#241E4E] tracking-tight">
                        Smart Savings Report Center
                    </h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">
                        Dedicated statements, collection registers, and financial reporting isolated from MFI microfinance operations.
                    </p>
                </div>

                <button
                    onClick={() => router.push("/dashboard/personal")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/40 transition-colors cursor-pointer w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Savings Hub
                </button>
            </div>

            {/* SECTION 1: PERSONAL LOAN REPORTS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-[#241E4E] text-[#7C5CFC]">
                                <Coins className="w-4 h-4" />
                            </span>
                            <h2 className="text-xl font-black text-[#241E4E] tracking-tight">
                                Personal Loan Credit Reports
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Regulatory audit registers, disbursement statements, collections, and delinquency tracking
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {loanReports.map((item, i) => (
                        <div
                            key={i}
                            onClick={item.action}
                            className="group relative flex flex-col justify-between p-6 bg-white border border-emerald-100 hover:border-[#7C5CFC] rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 select-none min-h-[190px]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 shadow-md group-hover:scale-105 transition-transform duration-300">
                                    {item.icon}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {item.badge}
                                    </span>
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-[#7C5CFC] group-hover:border-[#7C5CFC] group-hover:text-slate-950 transition-all duration-300 shadow-2xs">
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#241E4E] transition-colors duration-200">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: SAVINGS & DEPOSIT REPORTS */}
            <div className="space-y-4 pt-4 border-t border-emerald-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-[#241E4E] text-[#7C5CFC]">
                                <PiggyBank className="w-4 h-4" />
                            </span>
                            <h2 className="text-xl font-black text-[#241E4E] tracking-tight">
                                Savings &amp; Deposit Intelligence Reports
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Daily collections, maturity payouts, closed accounts, and cash balance summaries
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savingsReports.map((item, i) => (
                        <div
                            key={i}
                            onClick={item.action}
                            className="group relative flex flex-col justify-between p-6 bg-white border border-emerald-100 hover:border-[#7C5CFC] rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 select-none min-h-[190px]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 shadow-md group-hover:scale-105 transition-transform duration-300">
                                    {item.icon}
                                </div>
                                <div className="shrink-0 w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-[#7C5CFC] group-hover:border-[#7C5CFC] group-hover:text-slate-950 transition-all duration-300 shadow-2xs">
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
                                </div>
                            </div>

                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#241E4E] transition-colors duration-200">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
