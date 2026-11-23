"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, RefreshCw, PiggyBank, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface DepositItem {
    _id: string;
    receiptNo: string;
    depositDate: string;
    amount: number;
    installmentCount: number;
    paymentMethod: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
    remarks?: string;
    customer?: {
        name?: string;
        customerCode?: string;
        phone?: string;
        fullName?: string;
        clientId?: string;
        mobile?: string;
    };
    account?: {
        accountNumber?: string;
        frequency?: string;
        installmentAmount?: number;
        totalDeposited?: number;
    };
    collectedBy?: { name?: string };
}

export default function PersonalDepositReportPage() {
    const router = useRouter();
    const [deposits, setDeposits] = useState<DepositItem[]>([]);
    const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [method, setMethod] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(false);

    const loadDeposits = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            if (method !== "ALL") params.append("method", method);
            if (statusFilter !== "ALL") params.append("status", statusFilter);

            const res = await fetch(`/api/personal/reports/deposit-report?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setDeposits(data.deposits || []);
            } else {
                toast.error(data.error || "Failed to load deposit collections");
            }
        } catch {
            toast.error("Error fetching deposit collections");
        } finally {
            setLoading(false);
        }
    }, [from, to, method, statusFilter]);

    useEffect(() => {
        loadDeposits();
    }, [loadDeposits]);

    const stats = useMemo(() => {
        let totalAmt = 0;
        let totalInstallments = 0;
        let approvedAmt = 0;
        let approvedCount = 0;
        let pendingAmt = 0;
        let pendingCount = 0;
        let rejectedAmt = 0;
        let rejectedCount = 0;

        deposits.forEach((d) => {
            const amt = Number(d.amount || 0);
            totalAmt += amt;
            totalInstallments += Number(d.installmentCount || 1);

            if (d.status === "APPROVED" || !d.status) {
                approvedAmt += amt;
                approvedCount++;
            } else if (d.status === "PENDING") {
                pendingAmt += amt;
                pendingCount++;
            } else if (d.status === "REJECTED") {
                rejectedAmt += amt;
                rejectedCount++;
            }
        });

        return {
            count: deposits.length,
            totalAmt,
            totalInstallments,
            approvedAmt,
            approvedCount,
            pendingAmt,
            pendingCount,
            rejectedAmt,
            rejectedCount,
        };
    }, [deposits]);

    const exportCSV = () => {
        if (!deposits.length) return;
        const headers = [
            "Receipt No",
            "Date",
            "Account No",
            "Customer",
            "Mobile",
            "Installments",
            "Amount",
            "Method",
            "Status",
            "Collector",
            "Remarks",
        ];
        const rows = deposits.map((d) => [
            d.receiptNo,
            new Date(d.depositDate).toLocaleDateString(),
            d.account?.accountNumber || "",
            `"${d.customer?.fullName || d.customer?.name || ""}"`,
            `"${d.customer?.mobile || d.customer?.phone || ""}"`,
            d.installmentCount,
            d.amount,
            d.paymentMethod,
            d.status || "APPROVED",
            `"${d.collectedBy?.name || ""}"`,
            `"${(d.remarks || "").replace(/"/g, '""')}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `personal_deposits_${from}_to_${to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <PiggyBank className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Deposit Collections Register
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Savings Deposit Register
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Detailed log of all savings scheme collections across branches and collection agents.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={exportCSV}
                        disabled={!deposits.length}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-[#7C5CFC]" />
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <Printer className="w-4 h-4 text-[#7C5CFC]" />
                        Print
                    </Button>
                    <button
                        onClick={() => router.push("/dashboard/personal/report")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <p className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">Receipts Issued</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{stats.count}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{stats.totalInstallments} total installment(s)</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-emerald-500/40 rounded-3xl shadow-md">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Approved Collections</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">₹{stats.approvedAmt.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{stats.approvedCount} approved receipt(s)</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-amber-500/40 rounded-3xl shadow-md">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Approvals</p>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-amber-400 mt-1 font-mono">₹{stats.pendingAmt.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{stats.pendingCount} awaiting approval</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC] rounded-3xl shadow-md">
                    <p className="text-[11px] font-black text-slate-900/80 uppercase tracking-wider">Total Combined</p>
                    <p className="text-2xl font-black text-slate-950 mt-1 font-mono">₹{stats.totalAmt.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-slate-900/70 font-semibold mt-1">All collections recorded</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">From Date</label>
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold focus-visible:ring-[#7C5CFC]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">To Date</label>
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold focus-visible:ring-[#7C5CFC]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Payment Method</label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Methods" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Methods</SelectItem>
                                <SelectItem value="CASH">CASH</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="BANK_TRANSFER">BANK TRANSFER</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Approval Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses (Approved & Pending)</SelectItem>
                                <SelectItem value="APPROVED">Approved Only</SelectItem>
                                <SelectItem value="PENDING">Pending Approval Only</SelectItem>
                                <SelectItem value="REJECTED">Rejected Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={loadDeposits}
                        disabled={loading}
                        className="h-10 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Apply Filter
                    </Button>
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium text-sm animate-pulse">
                    Loading deposit records...
                </div>
            ) : deposits.length > 0 ? (
                <Card className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#241E4E] text-[#7C5CFC] border-b border-[#7C5CFC]/30 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Receipt</th>
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Account No</th>
                                    <th className="py-3.5 px-4">Customer</th>
                                    <th className="py-3.5 px-4 text-center">Installments</th>
                                    <th className="py-3.5 px-4 text-right">Amount</th>
                                    <th className="py-3.5 px-4 text-center">Method</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4">Collector</th>
                                    <th className="py-3.5 px-4">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {deposits.map((item) => (
                                    <tr key={item._id} className="hover:bg-emerald-50/40 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                                            {item.receiptNo}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                                            {new Date(item.depositDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                                            {item.account?.accountNumber || "-"}
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-slate-900">{item.customer?.fullName || item.customer?.name || "-"}</p>
                                            <p className="text-[10px] text-slate-400">{item.customer?.mobile || item.customer?.phone || item.customer?.clientId || ""}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                                            {item.installmentCount}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-sm text-[#241E4E] whitespace-nowrap font-mono">
                                            ₹{item.amount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                {item.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                                    item.status === "APPROVED" || !item.status
                                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                                        : item.status === "PENDING"
                                                        ? "bg-amber-50 text-amber-900 border-amber-300"
                                                        : "bg-rose-50 text-rose-800 border-rose-300"
                                                }`}
                                            >
                                                {item.status === "APPROVED" || !item.status ? (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Approved
                                                    </>
                                                ) : item.status === "PENDING" ? (
                                                    <>
                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                        Pending Approval
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3 h-3 text-rose-600" />
                                                        Rejected
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                            {item.collectedBy?.name || "-"}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate" title={item.remarks}>
                                            {item.remarks || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <p className="text-base font-bold text-slate-800">No Deposit Collections Found</p>
                    <p className="text-xs text-slate-400">Try adjusting your date range or filters.</p>
                </div>
            )}
        </section>
    );
}
