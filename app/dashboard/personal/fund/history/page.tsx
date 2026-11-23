"use client";

import { useState, useEffect } from "react";
import { History, Search } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonalAccount } from "@/types/personal";

export default function SavingsHistoryPage() {
    const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        let isMounted = true;
        async function loadHistory() {
            try {
                const res = await fetch("/api/personal/accounts");
                const data = await res.json();
                if (isMounted && data.success) {
                    // Filter out ACTIVE accounts (show MATURED, SETTLED, CLOSED)
                    const hist = (data.accounts || []).filter((a: PersonalAccount) => a.status !== "ACTIVE" && a.status !== "PENDING");
                    setAccounts(hist);
                }
            } catch {
                toast.error("Failed to fetch history");
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadHistory();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSettle = async (accId: string) => {
        if (!confirm("Confirm maturity payout settlement for this customer?")) return;
        try {
            const res = await fetch(`/api/personal/accounts/${accId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "SETTLED" }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Account marked as Settled and Disbursed!");
                setAccounts((prev) => prev.map((a) => (a._id === accId ? { ...a, status: "SETTLED" } : a)));
            }
        } catch {
            toast.error("Failed to settle account");
        }
    };

    const filtered = accounts.filter((a) => {
        const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
        const q = search.toLowerCase();
        const matchesSearch =
            a.accountNumber?.toLowerCase().includes(q) ||
            a.customer?.fullName?.toLowerCase().includes(q) ||
            a.customer?.mobile?.includes(q);
        return matchesStatus && matchesSearch;
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <History className="w-8 h-8 text-amber-500" />
                        Maturity & Settlement History
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Track completed 12+2 savings plans, maturity payouts, and closed accounts.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search matured accounts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {["ALL", "MATURED", "SETTLED", "CLOSED"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === s
                                    ? "bg-slate-900 text-amber-400 shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-900 text-amber-400 text-xs uppercase font-bold tracking-wider">
                            <th className="py-3.5 px-4 text-left">Account</th>
                            <th className="py-3.5 px-4 text-left">Customer</th>
                            <th className="py-3.5 px-4 text-left">Scheme</th>
                            <th className="py-3.5 px-4 text-right">Total Deposited</th>
                            <th className="py-3.5 px-4 text-right">Company Bonus</th>
                            <th className="py-3.5 px-4 text-right">Maturity Payout</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((acc) => (
                            <tr key={acc._id} className="hover:bg-amber-50/30 transition-colors">
                                <td className="py-4 px-4 font-mono font-bold text-slate-900">{acc.accountNumber}</td>
                                <td className="py-4 px-4">
                                    <p className="font-bold text-slate-900">{acc.customer?.fullName}</p>
                                    <p className="text-xs text-slate-500">{acc.customer?.mobile}</p>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="font-semibold text-slate-800">{acc.scheme?.schemeName}</span>
                                    <span className="block text-[11px] text-slate-500">{acc.frequency}</span>
                                </td>
                                <td className="py-4 px-4 text-right font-semibold text-slate-800">
                                    ₹ {acc.totalDeposited?.toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-right font-bold text-emerald-600">
                                    + ₹ {acc.benefitAmount?.toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-right font-black text-amber-600 text-base">
                                    ₹ {acc.maturityAmount?.toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                        acc.status === "MATURED"
                                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                                            : acc.status === "SETTLED"
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                            : "bg-slate-100 text-slate-600"
                                    }`}>
                                        {acc.status}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    {acc.status === "MATURED" ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleSettle(acc._id)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-8"
                                        >
                                            Settle Payout
                                        </Button>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-400">Archived</span>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                                    No completed or settled accounts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

