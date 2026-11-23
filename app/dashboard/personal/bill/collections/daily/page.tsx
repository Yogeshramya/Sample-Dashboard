"use client";

import { useEffect, useState, useCallback } from "react";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CalendarCheck,
    Coins,
    CheckCircle2,
    Search,
    Send,
    User,
    CheckSquare,
    Square,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

interface DailyRow {
    loanId: string;
    accountNumber: string;
    customerName: string;
    phone: string;
    dailyAmount: number;
    amountToPay: number;
    outstanding: number;
    selected: boolean;
}

export default function DailyCollectionPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rows, setRows] = useState<DailyRow[]>([]);
    const [search, setSearch] = useState("");
    const [totalTodayCollected, setTotalTodayCollected] = useState(0);

    const loadDailyLoans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?frequency=DAILY&status=ACTIVE,OVERDUE");
            const data = await res.json();
            if (data.success && data.loans) {
                const mapped: DailyRow[] = data.loans.map((ln: IPersonalLoanDocument) => {
                    const cust = typeof ln.customer === "object" ? ln.customer : null;
                    const acc = typeof ln.personalAccount === "object" ? ln.personalAccount : null;
                    const daily = ln.installmentAmount || 200;

                    return {
                        loanId: ln._id,
                        accountNumber: acc?.accountNumber || ln.loanId,
                        customerName: cust?.fullName || "Borrower",
                        phone: cust?.mobile || "",
                        dailyAmount: daily,
                        amountToPay: daily,
                        outstanding: ln.totalOutstanding || 0,
                        selected: false,
                    };
                });
                setRows(mapped);
            }
        } catch {
            toast.error("Failed to load daily loans");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDailyLoans();
    }, [loadDailyLoans]);

    const handleSelectAll = (select: boolean) => {
        setRows((prev) => prev.map((r) => ({ ...r, selected: select })));
    };

    const handleToggleRow = (index: number) => {
        setRows((prev) =>
            prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
        );
    };

    const handleAmountChange = (index: number, val: number) => {
        setRows((prev) =>
            prev.map((r, i) => (i === index ? { ...r, amountToPay: val } : r))
        );
    };

    const handleSubmitBatch = async () => {
        const selectedEntries = rows
            .filter((r) => r.selected && r.amountToPay > 0)
            .map((r) => ({
                loanId: r.loanId,
                amount: r.amountToPay,
                paymentMethod: "CASH",
                remarks: "Daily installment bulk collection",
            }));

        if (!selectedEntries.length) {
            return toast.error("Please select at least one customer row with an amount to collect");
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/personal/loans/collections/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries: selectedEntries }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const batchTotal = selectedEntries.reduce((sum, e) => sum + e.amount, 0);
                toast.success(`Successfully recorded ${data.count} daily collections! Day Sheet credited.`);
                setTotalTodayCollected((prev) => prev + batchTotal);
                loadDailyLoans();
            } else {
                toast.error(data.error || "Batch submission failed");
            }
        } catch {
            toast.error("Network error submitting batch");
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const filteredRows = rows.filter((r) => {
        const q = search.toLowerCase();
        return (
            r.customerName.toLowerCase().includes(q) ||
            r.phone.includes(q) ||
            r.accountNumber.toLowerCase().includes(q)
        );
    });

    const selectedCount = rows.filter((r) => r.selected).length;
    const selectedTotal = rows
        .filter((r) => r.selected)
        .reduce((sum, r) => sum + (Number(r.amountToPay) || 0), 0);

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading || submitting} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Daily Field Collection Grid
                    </h1>
                    <p className="text-xs text-slate-500">
                        Rapid single-touch and batch daily installment collection desk with live Day Sheet credit
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold text-right">
                        <div>Today&apos;s Batch Tally</div>
                        <div className="text-base font-black text-emerald-800">
                            {formatCurrency(totalTodayCollected)}
                        </div>
                    </div>
                </div>
            </div>

            <LoanNav />

            {/* ACTION BAR */}
            <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Quick find Borrower / Account..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-600"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-xl cursor-pointer"
                            onClick={() => handleSelectAll(rows.some((r) => !r.selected))}
                        >
                            {rows.every((r) => r.selected) ? "Deselect All" : "Select All"}
                        </Button>

                        <Button
                            disabled={selectedCount === 0 || submitting}
                            onClick={handleSubmitBatch}
                            className="bg-[#7C5CFC] hover:bg-[#d97706] text-slate-950 font-black rounded-xl text-xs px-4 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                            <Send className="w-4 h-4 mr-1.5" />
                            Submit Batch ({selectedCount} | {formatCurrency(selectedTotal)})
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* RAPID DAILY ENTRY TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-center w-12">Select</th>
                                    <th className="p-3 text-left">Borrower Name</th>
                                    <th className="p-3 text-left">Savings / Loan Code</th>
                                    <th className="p-3 text-right">Outstanding</th>
                                    <th className="p-3 text-right">Standard Daily</th>
                                    <th className="p-3 text-right w-36">Collection Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            No daily collection accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <tr
                                            key={row.loanId}
                                            className={`hover:bg-slate-50/70 transition-colors ${
                                                row.selected ? "bg-amber-50/50" : ""
                                            }`}
                                        >
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleRow(idx)}
                                                    className="cursor-pointer text-slate-700 hover:text-emerald-700"
                                                >
                                                    {row.selected ? (
                                                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-300" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900">{row.customerName}</div>
                                                <div className="text-[10px] text-slate-500">{row.phone}</div>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600 font-semibold">
                                                {row.accountNumber}
                                            </td>
                                            <td className="p-3 text-right font-bold text-rose-700">
                                                {formatCurrency(row.outstanding)}
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-700">
                                                {formatCurrency(row.dailyAmount)}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Input
                                                    type="number"
                                                    value={row.amountToPay}
                                                    onChange={(e) =>
                                                        handleAmountChange(idx, Number(e.target.value) || 0)
                                                    }
                                                    className="h-8 text-right font-black text-emerald-950 bg-white rounded-lg border-slate-300 focus:border-emerald-600"
                                                />
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

