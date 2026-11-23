"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonalDeposit } from "@/types/personal";

export default function DepositHistoryPage() {
    const [deposits, setDeposits] = useState<PersonalDeposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [search, setSearch] = useState("");

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let url = "/api/personal/deposits";
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setDeposits(data.deposits || []);
                setTotalAmount(data.totalAmount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch deposit history:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        async function loadInitial() {
            try {
                const res = await fetch("/api/personal/deposits");
                const data = await res.json();
                if (isMounted && data.success) {
                    setDeposits(data.deposits || []);
                    setTotalAmount(data.totalAmount || 0);
                }
            } catch (err) {
                console.error("Failed to fetch deposit history:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadInitial();
        return () => {
            isMounted = false;
        };
    }, []);

    const filtered = deposits.filter((d) => {
        const q = search.toLowerCase();
        return (
            d.receiptNo?.toLowerCase().includes(q) ||
            d.account?.accountNumber?.toLowerCase().includes(q) ||
            d.customer?.fullName?.toLowerCase().includes(q) ||
            d.customer?.mobile?.includes(q)
        );
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <ScrollText className="w-8 h-8 text-amber-500" />
                        Savings Deposit History & Ledger
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Detailed audit trail of all deposit receipts and installment collections.
                    </p>
                </div>

                {/* Total Stats Banner */}
                <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Period Collections</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                        ₹ {totalAmount.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Receipt No, Account No, Customer Name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto text-xs">
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="h-10 rounded-xl"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="h-10 rounded-xl"
                    />
                    <Button onClick={fetchHistory} className="h-10 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl px-4">
                        Apply
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-900 text-amber-400 text-xs uppercase font-bold tracking-wider">
                            <th className="py-3.5 px-4 text-left">Receipt No</th>
                            <th className="py-3.5 px-4 text-left">Account</th>
                            <th className="py-3.5 px-4 text-left">Customer</th>
                            <th className="py-3.5 px-4 text-center">Installments</th>
                            <th className="py-3.5 px-4 text-right">Amount Paid</th>
                            <th className="py-3.5 px-4 text-center">Payment Mode</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-center">Date & Time</th>
                            <th className="py-3.5 px-4 text-left">Collector</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((d) => (
                            <tr key={d._id} className="hover:bg-amber-50/30 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-amber-600">{d.receiptNo}</td>
                                <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                                    {d.account?.accountNumber || "-"}
                                </td>
                                <td className="py-3.5 px-4">
                                    <p className="font-bold text-slate-900">{d.customer?.fullName || "-"}</p>
                                    <p className="text-xs text-slate-400">{d.customer?.mobile || "-"}</p>
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                                    {d.installmentCount}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-slate-900 text-base">
                                    ₹ {d.amount?.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                        {d.paymentMethod}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                            d.status === "APPROVED" || !d.status
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                : d.status === "PENDING"
                                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                : "bg-rose-100 text-rose-800 border border-rose-300"
                                        }`}
                                    >
                                        {d.status === "APPROVED" || !d.status
                                            ? "Approved"
                                            : d.status === "PENDING"
                                            ? "Pending Approval"
                                            : "Rejected"}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                                    {new Date(d.depositDate).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                                    {d.collectedBy?.name || "Staff"}
                                </td>
                            </tr>
                        ))}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                                    No deposit records found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

