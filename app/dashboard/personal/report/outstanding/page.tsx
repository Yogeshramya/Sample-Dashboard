"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Scale,
    FileSpreadsheet,
    Printer,
    ArrowLeft,
    Coins,
    Calendar,
    Search,
    RefreshCw,
    TrendingUp,
    Percent,
    Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanOutstandingReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");
    const [frequency, setFrequency] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("status", "DISBURSED,ACTIVE,OVERDUE");
            if (frequency !== "ALL") params.append("frequency", frequency);
            if (search) params.append("search", search);

            const res = await fetch(`/api/personal/loans?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.loans) {
                setLoans(data.loans);
            }
        } catch {
            toast.error("Failed to load loan outstanding report");
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

    // Filter by statusFilter
    const filteredLoans = useMemo(() => {
        return loans.filter((l) => {
            if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
            return true;
        });
    }, [loans, statusFilter]);

    // Summary calculations
    const stats = useMemo(() => {
        const count = filteredLoans.length;
        const totalOutstanding = filteredLoans.reduce((acc, l) => acc + (Number(l.totalOutstanding) || 0), 0);
        const totalSanctioned = filteredLoans.reduce((acc, l) => acc + (Number(l.loanAmount) || 0), 0);
        const totalRepaid = filteredLoans.reduce((acc, l) => acc + (Number(l.totalPrincipalRepaid) || 0), 0);
        const recoveryRate = totalSanctioned > 0 ? ((totalRepaid / totalSanctioned) * 100).toFixed(1) : "0";

        return { count, totalOutstanding, totalSanctioned, totalRepaid, recoveryRate };
    }, [filteredLoans]);

    const handleExportCSV = () => {
        const headers = [
            "Loan ID",
            "Borrower Name",
            "Client ID",
            "Mobile",
            "Repayment Frequency",
            "Sanction Amount",
            "Principal Repaid",
            "Principal Outstanding",
            "Interest Outstanding",
            "Total Outstanding",
            "Disbursed Date",
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
                l.totalPrincipalRepaid,
                l.principalOutstanding ?? l.totalOutstanding,
                l.interestOutstanding ?? 0,
                l.totalOutstanding,
                l.disbursedAt ? new Date(l.disbursedAt).toISOString().split("T")[0] : "",
                l.status,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Personal_Loan_Outstanding_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Outstanding CSV report exported successfully");
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E]/10 border border-[#7C5CFC]/40 text-[#241E4E] text-xs font-bold tracking-wide uppercase mb-1">
                        <Scale className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Portfolio Book Exposure
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Loan Outstanding Balance Report
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Live exposure statement showing principal outstanding, unrecovered interest, and repayment recovery rates
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
                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Outstanding Book</span>
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                                <Banknote className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(stats.totalOutstanding)}
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            {stats.count} active running loans
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sanction Book Value</span>
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <Coins className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-amber-700 mt-2">
                            {formatCurrency(stats.totalSanctioned)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Original capital disbursed
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Principal Repaid</span>
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-700 mt-2">
                            {formatCurrency(stats.totalRepaid)}
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 mt-1">
                            Recovered principal capital
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recovery Ratio</span>
                            <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                                <Percent className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-purple-700 mt-2">
                            {stats.recoveryRate}%
                        </div>
                        <p className="text-[11px] font-semibold text-purple-700 mt-1">
                            Portfolio recovery index
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
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Active Statuses</option>
                                <option value="ACTIVE">ACTIVE Regular</option>
                                <option value="OVERDUE">OVERDUE In Arrears</option>
                                <option value="DISBURSED">DISBURSED Fresh</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setFrequency("ALL");
                                    setStatusFilter("ALL");
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
                                    <th className="p-3 text-right">Principal Repaid</th>
                                    <th className="p-3 text-right font-semibold">Principal Out</th>
                                    <th className="p-3 text-right font-semibold">Interest Out</th>
                                    <th className="p-3 text-right font-black text-rose-300">Total Outstanding</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredLoans.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-slate-400">
                                            No active loans with outstanding balance matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
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
                                                <td className="p-3 text-right text-blue-700 font-bold">
                                                    {formatCurrency(ln.totalPrincipalRepaid)}
                                                </td>
                                                <td className="p-3 text-right text-slate-800">
                                                    {formatCurrency(ln.principalOutstanding ?? ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-right text-slate-600">
                                                    {formatCurrency(ln.interestOutstanding ?? 0)}
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            ln.status === "ACTIVE"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : ln.status === "OVERDUE"
                                                                  ? "bg-rose-100 text-rose-800"
                                                                  : "bg-blue-100 text-blue-800"
                                                        }`}
                                                    >
                                                        {ln.status}
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

