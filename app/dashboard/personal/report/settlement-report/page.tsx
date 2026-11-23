"use client";

import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, Download, Printer, RefreshCw, Award } from "lucide-react";
import { useRouter } from "next/navigation";

interface SettlementAccount {
    _id: string;
    accountNumber: string;
    frequency: string;
    installmentAmount: number;
    totalTargetInstallments: number;
    paidInstallments: number;
    totalDeposited: number;
    benefitAmount: number;
    maturityAmount: number;
    startDate: string;
    maturityDate: string;
    status: string;
    updatedAt: string;
    customer?: { name?: string; customerCode?: string; phone?: string };
    scheme?: { schemeName?: string };
    collectorId?: { name?: string };
}

export default function PersonalSettlementReportPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<SettlementAccount[]>([]);
    const [status, setStatus] = useState("ALL");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [totals, setTotals] = useState({ deposited: 0, benefits: 0, payout: 0 });

    const loadReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (status !== "ALL") params.append("status", status);
            if (from) params.append("from", from);
            if (to) params.append("to", to);

            const res = await fetch(`/api/personal/reports/settlement-report?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setAccounts(data.accounts || []);
                setTotals({
                    deposited: data.totalDeposited || 0,
                    benefits: data.totalBenefits || 0,
                    payout: data.totalPayout || 0,
                });
            } else {
                toast.error(data.error || "Failed to load settlement register");
            }
        } catch {
            toast.error("Error loading settlement report");
        } finally {
            setLoading(false);
        }
    }, [status, from, to]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const exportCSV = () => {
        if (!accounts.length) return;
        const headers = ["Account No", "Customer", "Scheme", "Frequency", "Paid / Total", "Deposited", "Bonus", "Maturity Payout", "Status", "Maturity Date"];
        const rows = accounts.map((a) => [
            a.accountNumber,
            `"${a.customer?.name || ""}"`,
            `"${a.scheme?.schemeName || ""}"`,
            a.frequency,
            `${a.paidInstallments}/${a.totalTargetInstallments}`,
            a.totalDeposited,
            a.benefitAmount,
            a.maturityAmount,
            a.status,
            new Date(a.maturityDate).toLocaleDateString(),
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `personal_settlement_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <Award className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Maturity Register
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Settlement & Maturity Register
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Complete registry of accounts matured, settled, or closed with full payout calculations.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={exportCSV}
                        disabled={!accounts.length}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <p className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">Accounts Count</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{accounts.length}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC] rounded-3xl shadow-md">
                    <p className="text-[11px] font-black text-slate-900/80 uppercase tracking-wider">Total Principal Saved</p>
                    <p className="text-2xl font-black text-slate-950 mt-1 font-mono">₹{totals.deposited.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <p className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">Total Bonuses Accrued</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">+₹{totals.benefits.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC] rounded-3xl shadow-md">
                    <p className="text-[11px] font-black text-slate-900/80 uppercase tracking-wider">Total Payout Liability</p>
                    <p className="text-2xl font-black text-slate-950 mt-1 font-mono">₹{totals.payout.toLocaleString("en-IN")}</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Account Status</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Accounts</SelectItem>
                                <SelectItem value="MATURED">MATURED</SelectItem>
                                <SelectItem value="SETTLED">SETTLED</SelectItem>
                                <SelectItem value="CLOSED">CLOSED</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Maturity From</label>
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold focus-visible:ring-[#7C5CFC]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Maturity To</label>
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold focus-visible:ring-[#7C5CFC]"
                        />
                    </div>
                    <Button
                        onClick={loadReport}
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
                    Loading accounts...
                </div>
            ) : accounts.length > 0 ? (
                <Card className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#241E4E] text-[#7C5CFC] border-b border-[#7C5CFC]/30 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Account No</th>
                                    <th className="py-3.5 px-4">Customer</th>
                                    <th className="py-3.5 px-4">Scheme</th>
                                    <th className="py-3.5 px-4 text-center">Progress</th>
                                    <th className="py-3.5 px-4 text-right">Deposited</th>
                                    <th className="py-3.5 px-4 text-right">Accrued Bonus</th>
                                    <th className="py-3.5 px-4 text-right">Maturity Amount</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-center">Maturity Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map((item) => (
                                    <tr key={item._id} className="hover:bg-emerald-50/40 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                                            {item.accountNumber}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900">
                                            <div>{item.customer?.name || "-"}</div>
                                            <span className="text-[10px] text-slate-400">{item.customer?.phone}</span>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">
                                            {item.scheme?.schemeName || "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span className="font-bold text-slate-700">
                                                {item.paidInstallments} / {item.totalTargetInstallments}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block uppercase">
                                                {item.frequency}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                                            ₹{item.totalDeposited?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-[#241E4E] whitespace-nowrap font-mono">
                                            +₹{item.benefitAmount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-sm text-[#241E4E] whitespace-nowrap font-mono">
                                            ₹{item.maturityAmount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    item.status === "CLOSED"
                                                        ? "bg-slate-100 text-slate-700"
                                                        : item.status === "SETTLED"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600">
                                            {new Date(item.maturityDate).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <p className="text-base font-bold text-slate-800">No Accounts Found</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters or date range.</p>
                </div>
            )}
        </section>
    );
}
