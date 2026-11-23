"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertTriangle,
    FileSpreadsheet,
    Printer,
    ArrowLeft,
    Coins,
    Calendar,
    Search,
    RefreshCw,
    Scale,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument, IPersonalLoanDueItem } from "@/types/personal-loan";

export default function LoanArrearsReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");
    const [frequency, setFrequency] = useState("ALL");
    const [bucket, setBucket] = useState("ALL");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (frequency !== "ALL") params.append("frequency", frequency);
            if (search) params.append("search", search);

            const res = await fetch(`/api/personal/loans?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.loans) {
                // Filter loans that have status OVERDUE or have past-due unpaid installments
                const now = new Date();
                const overdueList = (data.loans as IPersonalLoanDocument[]).filter((l) => {
                    if (l.status === "OVERDUE") return true;
                    if (["DISBURSED", "ACTIVE"].includes(l.status)) {
                        const hasMissed = l.dues?.some(
                            (d: IPersonalLoanDueItem) => !d.isPaid && new Date(d.dueDate) < now
                        );
                        return Boolean(hasMissed);
                    }
                    return false;
                });
                setLoans(overdueList);
            }
        } catch {
            toast.error("Failed to load loan arrears report");
        } finally {
            setLoading(false);
        }
    }, [frequency, search]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const formatDate = (d: string | Date | null | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Calculate missed dues count and overdue amount per loan
    const loansWithOverdueInfo = useMemo(() => {
        const now = new Date();
        return loans.map((l) => {
            const pastDues = (l.dues || []).filter(
                (d: IPersonalLoanDueItem) => !d.isPaid && new Date(d.dueDate) < now
            );
            const overdueAmount = pastDues.reduce(
                (acc, d) => acc + (d.remainingAmount ?? (d.totalDue - (d.paidAmount || 0))),
                0
            );
            const missedCount = pastDues.length;
            const earliestDueDate = pastDues.length > 0 ? new Date(pastDues[0].dueDate) : null;
            const daysOverdue = earliestDueDate
                ? Math.max(0, Math.floor((now.getTime() - earliestDueDate.getTime()) / (1000 * 3600 * 24)))
                : 0;

            return {
                ...l,
                calculatedOverdueAmount: overdueAmount > 0 ? overdueAmount : l.totalOutstanding,
                missedDuesCount: missedCount > 0 ? missedCount : 1,
                daysOverdue,
            };
        });
    }, [loans]);

    // Apply bucket filter
    const filteredLoans = useMemo(() => {
        if (bucket === "ALL") return loansWithOverdueInfo;
        if (bucket === "1-7") return loansWithOverdueInfo.filter((l) => l.daysOverdue <= 7);
        if (bucket === "8-30") return loansWithOverdueInfo.filter((l) => l.daysOverdue > 7 && l.daysOverdue <= 30);
        if (bucket === "30+") return loansWithOverdueInfo.filter((l) => l.daysOverdue > 30);
        return loansWithOverdueInfo;
    }, [loansWithOverdueInfo, bucket]);

    // Summary KPIs
    const stats = useMemo(() => {
        const count = filteredLoans.length;
        const totalOverdue = filteredLoans.reduce((acc, l) => acc + (Number(l.calculatedOverdueAmount) || 0), 0);
        const totalOutstanding = filteredLoans.reduce((acc, l) => acc + (Number(l.totalOutstanding) || 0), 0);
        const avgOverdue = count > 0 ? totalOverdue / count : 0;
        return { count, totalOverdue, totalOutstanding, avgOverdue };
    }, [filteredLoans]);

    const handleExportCSV = () => {
        const headers = [
            "Loan ID",
            "Borrower Name",
            "Client ID",
            "Mobile",
            "Repayment Frequency",
            "Sanction Amount",
            "Total Outstanding",
            "Overdue Amount",
            "Missed Installments",
            "Days Overdue",
            "Status",
        ];

        const rows = filteredLoans.map((l) => {
            const cust = typeof l.customer === "object" ? l.customer : null;
            return [
                l.loanId,
                `"${cust?.fullName || ""}"`,
                cust?.clientId || "",
                cust?.mobile || "",
                l.repaymentFrequency,
                l.loanAmount,
                l.totalOutstanding,
                l.calculatedOverdueAmount,
                l.missedDuesCount,
                l.daysOverdue,
                l.status,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Personal_Loan_Arrears_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Arrears CSV report downloaded successfully");
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-2">
            <LoadingOverlay show={loading} />

            <div className="print:hidden">
                <PageHeader />
            </div>

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4 print:hidden">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold tracking-wide uppercase mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Delinquency Risk Register
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Loan Arrears &amp; Overdue Report
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Detailed delinquency aging report tracking missed installments, pending due balances, and overdue borrower accounts
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={handleExportCSV}
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={() => window.print()}
                    >
                        <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-emerald-200 text-[#241E4E] hover:bg-emerald-50 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={() => router.push("/dashboard/personal/report")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Report Hub
                    </Button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-rose-200 shadow-xs bg-rose-50/40">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Overdue Dues Total</span>
                            <div className="p-2 rounded-xl bg-rose-200 text-rose-900">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-rose-700 mt-2">
                            {formatCurrency(stats.totalOverdue)}
                        </div>
                        <p className="text-[11px] font-semibold text-rose-600 mt-1">
                            Immediate overdue capital at risk
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overdue Borrowers</span>
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {stats.count}
                        </div>
                        <p className="text-[11px] font-semibold text-amber-700 mt-1">
                            Accounts requiring immediate follow-up
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Portfolio Exposure</span>
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                                <Scale className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(stats.totalOutstanding)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Total balance on delinquent loans
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Overdue</span>
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                <Coins className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-700 mt-2">
                            {formatCurrency(stats.avgOverdue)}
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 mt-1">
                            Average arrear per defaulter
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="rounded-2xl border-slate-200 shadow-xs bg-white print:hidden">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                                placeholder="Search borrower, loan ID, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Repayment Modes</option>
                                <option value="DAILY">Daily Repayment</option>
                                <option value="WEEKLY">Weekly Repayment</option>
                                <option value="MONTHLY">Monthly Repayment</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={bucket}
                                onChange={(e) => setBucket(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Aging Buckets</option>
                                <option value="1-7">1 - 7 Days Overdue</option>
                                <option value="8-30">8 - 30 Days Overdue</option>
                                <option value="30+">30+ Days Critical Arrear</option>
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setFrequency("ALL");
                                    setBucket("ALL");
                                    loadData();
                                }}
                                className="h-10 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
                                title="Reset filters"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-left">Borrower Name</th>
                                    <th className="p-3 text-left">Mobile</th>
                                    <th className="p-3 text-center">Frequency</th>
                                    <th className="p-3 text-right">Sanction Amount</th>
                                    <th className="p-3 text-right">Total Outstanding</th>
                                    <th className="p-3 text-right font-black text-rose-300">Overdue Amount</th>
                                    <th className="p-3 text-center">Missed Dues</th>
                                    <th className="p-3 text-center">Days Overdue</th>
                                    <th className="p-3 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredLoans.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-400">
                                            No delinquent or overdue loans found matching the filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-rose-50/30 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3 font-bold text-slate-900">
                                                    <div>{cust?.fullName || "—"}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{cust?.clientId}</div>
                                                </td>
                                                <td className="p-3 text-slate-600">{cust?.mobile || "—"}</td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {ln.repaymentFrequency}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right text-slate-700">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-900">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700">
                                                    {formatCurrency(ln.calculatedOverdueAmount)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                                        {ln.missedDuesCount} due(s)
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            ln.daysOverdue > 30
                                                                ? "bg-rose-600 text-white"
                                                                : ln.daysOverdue > 7
                                                                  ? "bg-amber-100 text-amber-800"
                                                                  : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {ln.daysOverdue} days
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center print:hidden">
                                                    <button
                                                        onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/ledger`)}
                                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#241E4E] text-[#7C5CFC] hover:bg-[#241E4E] transition cursor-pointer"
                                                    >
                                                        Ledger
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

