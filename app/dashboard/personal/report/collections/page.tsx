"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Receipt,
    FileSpreadsheet,
    Printer,
    ArrowLeft,
    Coins,
    Calendar,
    Search,
    RefreshCw,
    TrendingUp,
    Scale,
} from "lucide-react";
import { toast } from "sonner";

interface CollectionRecord {
    _id: string;
    receiptNo: string;
    loan?: {
        _id?: string;
        loanId?: string;
        loanAmount?: number;
        repaymentFrequency?: string;
        status?: string;
    };
    customer?: {
        clientId?: string;
        fullName?: string;
        mobile?: string;
    };
    personalAccount?: {
        accountNumber?: string;
    };
    collectedBy?: {
        name?: string;
    };
    installmentNo?: number;
    collectionType: string;
    totalAmount: number;
    principalPortion: number;
    interestPortion: number;
    penaltyPortion: number;
    paymentMethod: string;
    transactionDate: string;
    remarks?: string;
}

export default function LoanCollectionsReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [collections, setCollections] = useState<CollectionRecord[]>([]);
    const [search, setSearch] = useState("");
    const [method, setMethod] = useState("ALL");
    const [type, setType] = useState("ALL");
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setDate(1); // 1st of current month
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            if (method !== "ALL") params.append("method", method);
            if (type !== "ALL") params.append("type", type);
            if (search) params.append("search", search);

            const res = await fetch(`/api/personal/reports/loan-collections?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.collections) {
                setCollections(data.collections);
            }
        } catch {
            toast.error("Failed to load loan collections report");
        } finally {
            setLoading(false);
        }
    }, [from, to, method, type, search]);

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

    // Calculate aggregated metrics
    const stats = useMemo(() => {
        const count = collections.length;
        const total = collections.reduce((acc, c) => acc + (Number(c.totalAmount) || 0), 0);
        const principal = collections.reduce((acc, c) => acc + (Number(c.principalPortion) || 0), 0);
        const interest = collections.reduce((acc, c) => acc + (Number(c.interestPortion) || 0), 0);
        const penalty = collections.reduce((acc, c) => acc + (Number(c.penaltyPortion) || 0), 0);
        return { count, total, principal, interest, penalty };
    }, [collections]);

    const handleExportCSV = () => {
        const headers = [
            "Receipt No",
            "Date",
            "Loan ID",
            "Borrower Name",
            "Client ID",
            "Mobile",
            "Collection Type",
            "Principal Recovered",
            "Interest Earned",
            "Late Penalty",
            "Total Amount",
            "Payment Method",
            "Collected By",
        ];

        const rows = collections.map((c) => {
            return [
                c.receiptNo,
                c.transactionDate ? new Date(c.transactionDate).toISOString().split("T")[0] : "",
                c.loan?.loanId || "",
                `"${c.customer?.fullName || ""}"`,
                c.customer?.clientId || "",
                c.customer?.mobile || "",
                c.collectionType,
                c.principalPortion,
                c.interestPortion,
                c.penaltyPortion,
                c.totalAmount,
                c.paymentMethod,
                `"${c.collectedBy?.name || ""}"`,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Personal_Loan_Collections_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Collections CSV report downloaded successfully");
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
                        <Receipt className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Recovery Inflow
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Loan Collections &amp; Recovery Report
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Detailed ledger receipts of daily and weekly loan installment collections, interest splits, and penalty receipts
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
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Collection</span>
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                                <Receipt className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-800 mt-2">
                            {formatCurrency(stats.total)}
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            {stats.count} collection receipts
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Principal Repaid</span>
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                <Scale className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-800 mt-2">
                            {formatCurrency(stats.principal)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Capital recovered into branch cash
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Interest Inflow</span>
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-amber-700 mt-2">
                            {formatCurrency(stats.interest)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Interest revenues earned
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Late Penalties</span>
                            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                                <Coins className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-rose-700 mt-2">
                            {formatCurrency(stats.penalty)}
                        </div>
                        <p className="text-[11px] font-semibold text-rose-600 mt-1">
                            Default penalty fees collected
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
                                placeholder="Search receipt, loan, borrower..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Collection Types</option>
                                <option value="DAILY">Daily Installment</option>
                                <option value="WEEKLY">Weekly Installment</option>
                                <option value="MONTHLY">Monthly Installment</option>
                                <option value="PRECLOSURE_SETTLEMENT">Preclosure Settlement</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="w-full h-10 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            >
                                <option value="ALL">All Payment Methods</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI / QR</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                        </div>

                        <div>
                            <Input
                                type="date"
                                placeholder="From date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                placeholder="To date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setMethod("ALL");
                                    setType("ALL");
                                    const d = new Date();
                                    d.setDate(1);
                                    setFrom(d.toISOString().slice(0, 10));
                                    setTo(new Date().toISOString().slice(0, 10));
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
                                    <th className="p-3 text-left">Receipt No</th>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-left">Borrower</th>
                                    <th className="p-3 text-center">Type</th>
                                    <th className="p-3 text-right">Principal</th>
                                    <th className="p-3 text-right">Interest</th>
                                    <th className="p-3 text-right">Penalty</th>
                                    <th className="p-3 text-right font-black">Total Paid</th>
                                    <th className="p-3 text-center">Mode</th>
                                    <th className="p-3 text-left">Collector</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {collections.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-slate-400">
                                            No collection entries matching the specified criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    collections.map((c) => (
                                        <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3 font-mono font-bold text-slate-900">
                                                {c.receiptNo}
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {formatDate(c.transactionDate)}
                                            </td>
                                            <td className="p-3 font-mono font-semibold text-slate-800">
                                                {c.loan?.loanId || "—"}
                                            </td>
                                            <td className="p-3 font-bold text-slate-900">
                                                <div>{c.customer?.fullName || "—"}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{c.customer?.clientId}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {c.collectionType}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right text-blue-700 font-bold">
                                                {formatCurrency(c.principalPortion)}
                                            </td>
                                            <td className="p-3 text-right text-amber-700 font-bold">
                                                {formatCurrency(c.interestPortion)}
                                            </td>
                                            <td className="p-3 text-right text-rose-600 font-semibold">
                                                {formatCurrency(c.penaltyPortion)}
                                            </td>
                                            <td className="p-3 text-right font-black text-emerald-800">
                                                {formatCurrency(c.totalAmount)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    {c.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {c.collectedBy?.name || "Staff"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

