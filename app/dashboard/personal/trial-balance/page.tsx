"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import {
    ArrowLeft,
    Printer,
    Scale,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Coins,
    ArrowRightLeft,
    Search,
    RefreshCw,
} from "lucide-react";
import { getTodayIST } from "@/lib/ist";

interface LedgerItem {
    title: string;
    amount: number;
    type: string;
}

interface Summary {
    totalIncome: number;
    totalExpense: number;
    netDifference: number;
    deposits: number;
    credits: number;
    debits: number;
    settlements: number;
    inRemittance: number;
    outRemittance: number;
}

export default function PersonalTrialBalancePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(todayIST);
    const [toDate, setToDate] = useState(todayIST);

    const [incomes, setIncomes] = useState<LedgerItem[]>([]);
    const [expenses, setExpenses] = useState<LedgerItem[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalIncome: 0,
        totalExpense: 0,
        netDifference: 0,
        deposits: 0,
        credits: 0,
        debits: 0,
        settlements: 0,
        inRemittance: 0,
        outRemittance: 0,
    });

    useEffect(() => {
        if (isTeller) {
            setFromDate(todayIST);
            setToDate(todayIST);
        }
    }, [isTeller, todayIST]);

    const loadTrialBalance = async () => {
        setLoading(true);
        try {
            const fDate = isTeller ? todayIST : fromDate;
            const tDate = isTeller ? todayIST : toDate;

            const res = await fetch(`/api/personal/trial-balance?from=${fDate}&to=${tDate}`);
            const data = await res.json();

            if (data.success) {
                setIncomes(data.incomes || []);
                setExpenses(data.expenses || []);
                if (data.summary) setSummary(data.summary);
            } else {
                toast.error(data.error || "Failed to load trial balance");
            }
        } catch {
            toast.error("Error computing savings trial balance");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrialBalance();
    }, [fromDate, toDate, isTeller]);

    const formatINR = (val: number) =>
        Number(val || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <PageHeader />
            <LoadingOverlay show={loading} />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-emerald-950/10 print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-[10px] font-bold uppercase tracking-wider mb-1">
                            <Scale className="w-3.5 h-3.5 text-[#7C5CFC]" />
                            Smart Savings &bull; Financial Ledger
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Smart Savings Trial Balance
                        </h1>
                        <p className="text-xs text-slate-600 font-medium">
                            Isolated dual-entry ledger for savings deposits, other income, operational expenses, settlements, and remittances.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={loadTrialBalance}
                        className="rounded-xl text-xs font-semibold gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => window.print()}
                        className="bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5" /> Print Trial Balance
                    </Button>
                </div>
            </div>

            {/* Filter Card */}
            <Card className="p-4 bg-white border border-slate-200/90 shadow-xs rounded-2xl print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-slate-600">From Date</label>
                        <Input
                            type="date"
                            value={fromDate}
                            disabled={isTeller}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="rounded-xl h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-slate-600">To Date</label>
                        <Input
                            type="date"
                            value={toDate}
                            disabled={isTeller}
                            onChange={(e) => setToDate(e.target.value)}
                            className="rounded-xl h-9 text-xs"
                        />
                    </div>
                    <Button
                        onClick={loadTrialBalance}
                        disabled={loading}
                        className="h-9 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Search className="w-3.5 h-3.5" />
                        {loading ? "Computing..." : "Update Statement"}
                    </Button>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-[#7C5CFC] tracking-wider">
                                Total Inflows (Credit)
                            </span>
                            <h3 className="text-2xl font-black text-white font-mono mt-1">
                                ₹{formatINR(summary.totalIncome)}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 shadow-xs">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-emerald-100/70 mt-2 font-medium">
                        Deposits: ₹{formatINR(summary.deposits)} | Incomes: ₹{formatINR(summary.credits)}
                    </p>
                </div>

                <div className="p-5 bg-white border border-rose-200/80 rounded-3xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-rose-800 tracking-wider">
                                Total Outflows (Debit)
                            </span>
                            <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">
                                ₹{formatINR(summary.totalExpense)}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 shadow-xs">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-rose-600 mt-2 font-medium">
                        Expenses: ₹{formatINR(summary.debits)} | Settlements: ₹{formatINR(summary.settlements)}
                    </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC] rounded-3xl shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase text-slate-900/80 tracking-wider">
                                Net Cash Balance
                            </span>
                            <h3 className="text-2xl font-black font-mono mt-1 text-slate-950">
                                ₹{formatINR(summary.netDifference)}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 shadow-xs">
                            <Scale className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-900/75 mt-2 font-bold">
                        {summary.netDifference >= 0 ? "Net Positive Cash Generation" : "Net Outflow in Period"}
                    </p>
                </div>
            </div>

            {/* Official Printable Statement Sheet */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0 space-y-6">
                {/* Official Title Header */}
                <div className="text-center pb-4 border-b border-slate-200">
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-wide">
                        SAMPLE PRIME SMALL FINANCE PVT LTD
                    </h2>
                    <p className="text-xs font-bold text-slate-600 tracking-widest uppercase mt-0.5">
                        SMART SAVINGS PLAN &bull; TRIAL BALANCE STATEMENT
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong> &bull; Currency: Indian Rupees (INR)
                    </p>
                </div>

                {/* Dual Column Ledger */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Credit / Incomes */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="bg-[#241E4E] text-[#7C5CFC] border-b border-[#7C5CFC]/30 p-3.5 font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                            <span>Credit (Cash Inflows & Deposits)</span>
                            <span className="font-mono text-white font-black">₹{formatINR(summary.totalIncome)}</span>
                        </div>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-emerald-50/60 border-b border-emerald-100 text-emerald-950 font-bold">
                                <tr>
                                    <th className="p-2.5">Particulars</th>
                                    <th className="p-2.5 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {incomes.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="p-6 text-center text-slate-400">
                                            No credit transactions recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    incomes.map((inc, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2.5 text-slate-800 font-medium">
                                                {inc.title}
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-[#241E4E]">
                                                ₹{formatINR(inc.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-emerald-50 border-t-2 border-emerald-300 font-bold text-emerald-950">
                                <tr>
                                    <td className="p-2.5 uppercase">Total Credits</td>
                                    <td className="p-2.5 text-right font-mono text-sm font-black text-[#241E4E]">
                                        ₹{formatINR(summary.totalIncome)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Right: Debit / Outflows */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="bg-rose-900 text-rose-100 border-b border-rose-800 p-3.5 font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                            <span>Debit (Expenses & Settlements)</span>
                            <span className="font-mono text-white font-black">₹{formatINR(summary.totalExpense)}</span>
                        </div>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-rose-50/60 border-b border-rose-100 text-rose-950 font-bold">
                                <tr>
                                    <th className="p-2.5">Particulars</th>
                                    <th className="p-2.5 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="p-6 text-center text-slate-400">
                                            No debit transactions recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    expenses.map((exp, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2.5 text-slate-800 font-medium">
                                                {exp.title}
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                                                ₹{formatINR(exp.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-rose-50 border-t-2 border-rose-300 font-bold text-rose-950">
                                <tr>
                                    <td className="p-2.5 uppercase">Total Debits</td>
                                    <td className="p-2.5 text-right font-mono text-sm font-black text-rose-700">
                                        ₹{formatINR(summary.totalExpense)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Audit & Balance Verdict */}
                <div className="p-4 rounded-2xl bg-[#241E4E] text-white border border-[#7C5CFC]/30 flex flex-col sm:flex-row items-center justify-between text-xs gap-3 shadow-md">
                    <span className="text-emerald-100/80 font-medium">
                        Statement Audited & Calculated exclusively from Smart Savings Ledgers.
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[#7C5CFC]">Closing Surplus / Deficit:</span>
                        <span className={`font-mono text-base font-black px-3.5 py-1 rounded-xl shadow-xs ${summary.netDifference >= 0 ? "bg-[#EDE9FE] text-[#7C5CFC] border border-[#DDD6FE]" : "bg-rose-500 text-white"}`}>
                            ₹{formatINR(summary.netDifference)}
                        </span>
                    </div>
                </div>

                {/* Signatories Block */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-6 border-t border-slate-200 text-center text-xs">
                    <div>
                        <div className="border-b border-black w-36 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">Cashier / Staff</span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">Prepared By</p>
                    </div>
                    <div>
                        <div className="border-b border-black w-36 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">Branch Manager</span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">Checked By</p>
                    </div>
                    <div>
                        <div className="border-b border-black w-36 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">Authorized Auditor</span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">Approved By</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

