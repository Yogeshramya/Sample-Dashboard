"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Lock,
    FileSpreadsheet,
    Printer,
    ArrowLeft,
    Coins,
    Calendar,
    Search,
    RefreshCw,
    CheckCircle2,
    ShieldCheck,
    Scale,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanClosureReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");
    const [closureType, setClosureType] = useState("ALL");
    const [frequency, setFrequency] = useState("ALL");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("status", "CLOSED,PRECLOSED");
            if (frequency !== "ALL") params.append("frequency", frequency);
            if (search) params.append("search", search);

            const res = await fetch(`/api/personal/loans?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.loans) {
                setLoans(data.loans);
            }
        } catch {
            toast.error("Failed to load loan closure report");
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

    // Filter by closureType and date
    const filteredLoans = useMemo(() => {
        return loans.filter((l) => {
            if (closureType !== "ALL") {
                const isPre = l.closureType === "PRECLOSURE" || l.status === "PRECLOSED";
                if (closureType === "PRECLOSED" && !isPre) return false;
                if (closureType === "NORMAL" && isPre) return false;
            }

            if (l.closedAt) {
                const d = new Date(l.closedAt);
                if (from) {
                    const f = new Date(from);
                    f.setHours(0, 0, 0, 0);
                    if (d < f) return false;
                }
                if (to) {
                    const t = new Date(to);
                    t.setHours(23, 59, 59, 999);
                    if (d > t) return false;
                }
            }

            return true;
        });
    }, [loans, closureType, from, to]);

    // Summary calculations
    const stats = useMemo(() => {
        const count = filteredLoans.length;
        const normalCount = filteredLoans.filter((l) => (l.closureType === "NORMAL" || l.status === "CLOSED")).length;
        const preclosedCount = filteredLoans.filter((l) => (l.closureType === "PRECLOSURE" || l.status === "PRECLOSED")).length;
        const totalPrincipal = filteredLoans.reduce((acc, l) => acc + (Number(l.totalPrincipalRepaid) || 0), 0);
        const totalInterest = filteredLoans.reduce((acc, l) => acc + (Number(l.totalInterestRepaid) || 0), 0);
        const totalRecovered = totalPrincipal + totalInterest;

        return { count, normalCount, preclosedCount, totalRecovered };
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
            "Interest Repaid",
            "Closure Type",
            "Closed Date",
            "NOC Issued",
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
                l.totalInterestRepaid,
                l.closureType || l.status,
                l.closedAt ? new Date(l.closedAt).toISOString().split("T")[0] : "",
                l.nocIssued ? "YES" : "NO",
                l.status,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Personal_Loan_Closure_Register.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Closure CSV report exported successfully");
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
                        <Lock className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Settlement Audit
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Loan Closure &amp; Settlement Report
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Comprehensive ledger statement of maturely settled and early pre-closed personal loans with NOC certification records
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
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closed Accounts</span>
                            <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                                <Lock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {stats.count}
                        </div>
                        <p className="text-[11px] font-semibold text-purple-700 mt-1">
                            Fully settled loan agreements
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Normal Settlements</span>
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-700 mt-2">
                            {stats.normalCount}
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            Completed full loan tenure
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Early Preclosures</span>
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <Coins className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-amber-700 mt-2">
                            {stats.preclosedCount}
                        </div>
                        <p className="text-[11px] font-semibold text-amber-700 mt-1">
                            Settled before maturity
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Recovered</span>
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                <Scale className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-700 mt-2">
                            {formatCurrency(stats.totalRecovered)}
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 mt-1">
                            Principal &amp; interest repaid
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="rounded-2xl border-slate-200 shadow-xs bg-white print:hidden">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
                                value={closureType}
                                onChange={(e) => setClosureType(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Closure Types</option>
                                <option value="NORMAL">Normal Full Settlement</option>
                                <option value="PRECLOSED">Early Preclosure</option>
                            </select>
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

                        <div>
                            <Input
                                type="date"
                                placeholder="Closed From"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                placeholder="Closed To"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setClosureType("ALL");
                                    setFrequency("ALL");
                                    setFrom("");
                                    setTo("");
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
                                    <th className="p-3 text-right">Interest Repaid</th>
                                    <th className="p-3 text-center">Closure Type</th>
                                    <th className="p-3 text-left">Closed Date</th>
                                    <th className="p-3 text-center">NOC Status</th>
                                    <th className="p-3 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredLoans.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-slate-400">
                                            No closed or settled personal loans found matching the filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;
                                        const type = ln.closureType === "PRECLOSURE" || ln.status === "PRECLOSED" ? "PRECLOSED" : "NORMAL";

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
                                                <td className="p-3 text-right text-slate-700 font-semibold">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-right text-emerald-700 font-bold">
                                                    {formatCurrency(ln.totalPrincipalRepaid)}
                                                </td>
                                                <td className="p-3 text-right text-amber-700 font-bold">
                                                    {formatCurrency(ln.totalInterestRepaid)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            type === "PRECLOSED"
                                                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                        }`}
                                                    >
                                                        {type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-600">
                                                    {formatDate(ln.closedAt)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            ln.nocIssued
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {ln.nocIssued ? "ISSUED" : "PENDING"}
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

