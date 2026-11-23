"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Users, Phone, Mail, Search, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface Collector {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    branch?: { name?: string; branchName?: string };
    activeAccountsCount: number;
    totalCollected: number;
}

export default function PersonalEmployeesPage() {
    const router = useRouter();
    const [collectors, setCollectors] = useState<Collector[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const loadCollectors = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/collectors");
            const data = await res.json();
            if (data.success) {
                setCollectors(data.collectors || []);
            } else {
                toast.error(data.error || "Failed to load staff list");
            }
        } catch {
            toast.error("Error loading collectors");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCollectors(true);
    }, [loadCollectors]);

    const filtered = useMemo(() => {
        if (!searchTerm) return collectors;
        const q = searchTerm.toLowerCase();
        return collectors.filter(
            (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.employeeId?.toLowerCase().includes(q)
        );
    }, [collectors, searchTerm]);

    const stats = useMemo(() => {
        const totalStaff = collectors.length;
        const totalAccounts = collectors.reduce((s, c) => s + c.activeAccountsCount, 0);
        const totalCollected = collectors.reduce((s, c) => s + c.totalCollected, 0);
        return { totalStaff, totalAccounts, totalCollected };
    }, [collectors]);

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <Users className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Field Force & Collection Officers
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Smart Savings Staff & Collectors
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Field agent directory, active savings account allocations, and lifetime collection performance.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadCollectors(true)}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <button
                        onClick={() => router.push("/dashboard/personal")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Savings Hub
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <p className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">Assigned Staff</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{stats.totalStaff}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] text-white border border-[#7C5CFC] rounded-3xl shadow-md">
                    <p className="text-[11px] font-black text-slate-900/80 uppercase tracking-wider">Active Savings Accounts Managed</p>
                    <p className="text-2xl font-black text-slate-950 mt-1 font-mono">{stats.totalAccounts}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-white border border-[#7C5CFC]/30 rounded-3xl shadow-md">
                    <p className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">Total Savings Collected</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">₹{stats.totalCollected.toLocaleString("en-IN")}</p>
                </div>
            </div>

            {/* Search Input */}
            <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search staff by name, phone, email, employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold focus-visible:ring-[#7C5CFC]"
                    />
                </div>
            </Card>

            {/* Staff Cards Grid */}
            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium text-sm animate-pulse">
                    Loading staff directory...
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((c) => (
                        <Card key={c._id} className="p-5 bg-white border-slate-200 hover:border-[#7C5CFC] rounded-3xl shadow-xs transition-all duration-300">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {c.designation || c.role} {c.employeeId ? `• ${c.employeeId}` : ""}
                                    </p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/30">
                                    {c.branch?.name || c.branch?.branchName || "Main Branch"}
                                </span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                                {c.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{c.phone}</span>
                                    </div>
                                )}
                                {c.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Active Accounts</p>
                                    <p className="text-base font-black text-slate-900 mt-0.5 font-mono">{c.activeAccountsCount}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                                    <p className="text-[10px] font-bold text-[#241E4E] uppercase">Collected</p>
                                    <p className="text-base font-black text-[#241E4E] mt-0.5 font-mono">₹{c.totalCollected.toLocaleString("en-IN")}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <p className="text-base font-bold text-slate-800">No Staff Found</p>
                    <p className="text-xs text-slate-400">No staff members match your search criteria.</p>
                </div>
            )}
        </section>
    );
}
