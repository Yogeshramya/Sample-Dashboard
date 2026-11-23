"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Wallet,
    Search,
    PlusCircle,
    Phone,
    Calendar,
    Coins
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { PersonalAccount } from "@/types/personal";

export default function ActiveSavingsAccountsPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [frequencyFilter, setFrequencyFilter] = useState("ALL");

    useEffect(() => {
        let isMounted = true;
        async function loadAccounts() {
            try {
                const res = await fetch("/api/personal/accounts?status=ACTIVE");
                const data = await res.json();
                if (isMounted && data.success) {
                    setAccounts(data.accounts || []);
                }
            } catch (err) {
                console.error("Failed to load active accounts:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadAccounts();
        return () => {
            isMounted = false;
        };
    }, []);

    const filtered = accounts.filter((acc) => {
        const matchesFreq = frequencyFilter === "ALL" || acc.frequency === frequencyFilter;
        const q = search.toLowerCase();
        const matchesSearch =
            acc.accountNumber?.toLowerCase().includes(q) ||
            acc.customer?.fullName?.toLowerCase().includes(q) ||
            acc.customer?.mobile?.includes(q) ||
            acc.customer?.clientId?.toLowerCase().includes(q);
        return matchesFreq && matchesSearch;
    });

    const totalPortfolioDeposits = accounts.reduce((sum, a) => sum + (a.totalDeposited || 0), 0);

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-amber-500" />
                        Active Savings Accounts
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Track customer deposits, installment progress, and upcoming maturity deadlines.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Portfolio Saved</p>
                        <p className="text-xl font-black text-slate-900">₹ {totalPortfolioDeposits.toLocaleString()}</p>
                    </div>
                    <Button
                        onClick={() => router.push("/dashboard/personal/fund/new")}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Open New Account
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Account No (YPS-...), Customer Name, Mobile..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {(["ALL", "DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFrequencyFilter(f)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                frequencyFilter === f
                                    ? "bg-slate-900 text-amber-400 shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((acc) => {
                    const percent =
                        acc.totalTargetInstallments > 0
                            ? Math.min(100, Math.round((acc.paidInstallments / acc.totalTargetInstallments) * 100))
                            : 0;

                    return (
                        <Card
                            key={acc._id}
                            className="bg-white border-slate-200 hover:border-amber-400 rounded-3xl shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
                        >
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                            {acc.accountNumber}
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">
                                            {acc.customer?.fullName || "Unnamed Customer"}
                                        </h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {acc.customer?.mobile || "-"}
                                        </p>
                                    </div>

                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase border border-amber-300">
                                        {acc.frequency}
                                    </span>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Per Installment:</span>
                                        <span className="font-bold text-slate-900 text-sm">
                                            ₹ {acc.installmentAmount?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Deposited So Far:</span>
                                        <span className="font-black text-amber-600">
                                            ₹ {acc.totalDeposited?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Maturity Target:</span>
                                        <span className="font-bold text-slate-800">
                                            ₹ {acc.maturityAmount?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-500">
                                            Installments: {acc.paidInstallments} / {acc.totalTargetInstallments}
                                        </span>
                                        <span className="text-amber-600">{percent}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-linear-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        Matures: {new Date(acc.maturityDate).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        onClick={() => router.push(`/dashboard/personal/bill/collect?accountId=${acc._id}`)}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs py-2 h-9"
                                    >
                                        <Coins className="w-3.5 h-3.5 mr-1.5" /> Record Deposit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 font-medium">
                        No active savings accounts found.
                    </div>
                )}
            </div>
        </section>
    );
}

