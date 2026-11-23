"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Phone, ArrowLeft, RefreshCw, Search, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalAccount } from "@/types/personal";
import { formatSchemeBenefitLabel } from "@/lib/personalSchemeCalc";

export default function SavingsApprovalPage() {
    const router = useRouter();
    const [pendingAccounts, setPendingAccounts] = useState<PersonalAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const loadPending = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/accounts?status=PENDING");
            const data = await res.json();
            if (data.success) {
                setPendingAccounts(data.accounts || []);
            } else {
                toast.error(data.message || "Failed to fetch pending accounts");
            }
        } catch {
            toast.error("Network error while loading pending accounts");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPending(true);
    }, [loadPending]);

    const handleAction = async (accountId: string, action: "approve" | "reject") => {
        setActionId(accountId);
        try {
            const res = await fetch(`/api/personal/accounts/${accountId}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: action === "reject" ? "Rejected by administrator" : "" }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Savings Plan ${action === "approve" ? "Approved & Activated" : "Rejected"} successfully`);
                setPendingAccounts((prev) => prev.filter((a) => a._id !== accountId));
            } else {
                toast.error(data.error || data.message || `Failed to ${action} account`);
            }
        } catch {
            toast.error("Network error during action");
        } finally {
            setActionId(null);
        }
    };

    const filtered = pendingAccounts.filter((acc) => {
        const q = search.toLowerCase();
        return (
            acc.accountNumber?.toLowerCase().includes(q) ||
            acc.customer?.fullName?.toLowerCase().includes(q) ||
            acc.customer?.mobile?.includes(q) ||
            acc.scheme?.schemeName?.toLowerCase().includes(q)
        );
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <CheckCircle className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Account Verification &amp; Activation
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pending Savings Plan Approvals
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Review customer scheme selection, KYC terms, and authorize new Smart Savings subscriptions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadPending(true)}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <button
                        onClick={() => router.push("/dashboard/personal/approval")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Approvals
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Account Number, Customer Name, Mobile..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl text-xs"
                    />
                </div>
                <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    Showing <span className="text-slate-900 font-black">{filtered.length}</span> Pending Plans
                </div>
            </div>

            <div className="space-y-4">
                {filtered.map((acc) => {
                    const benefitLabel = formatSchemeBenefitLabel(acc.scheme);
                    return (
                        <Card
                            key={acc._id}
                            className="bg-white border-slate-200/90 hover:border-amber-400 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all duration-300"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#7C5CFC] bg-[#241E4E] px-2.5 py-0.5 rounded border border-[#7C5CFC]/30">
                                            {acc.accountNumber}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                            Pending Approval
                                        </span>
                                        <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                            {acc.frequency}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">{acc.customer?.fullName}</h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {acc.customer?.mobile} • Plan: <strong className="text-slate-800">{acc.scheme?.schemeName}</strong>
                                        </p>
                                    </div>

                                    {/* Breakdown chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Installment</span>
                                            <p className="font-black text-slate-900">₹ {acc.installmentAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Tenure</span>
                                            <p className="font-bold text-slate-900">{acc.durationMonths || 12} Months</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <span className="text-[10px] text-emerald-700 uppercase font-bold">Bonus ({benefitLabel})</span>
                                            <p className="font-black text-emerald-700">+ ₹ {acc.benefitAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                                            <span className="text-[10px] text-amber-700 uppercase font-bold">Maturity Target</span>
                                            <p className="font-black text-amber-900">₹ {acc.maturityAmount?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Nominee details if available */}
                                    {acc.nomineeName && (
                                        <p className="text-[11px] text-slate-500">
                                            Nominee: <strong className="text-slate-700">{acc.nomineeName}</strong> ({acc.nomineeRelation || "Beneficiary"})
                                            {acc.nomineePhone && ` • Phone: ${acc.nomineePhone}`}
                                        </p>
                                    )}
                                </div>

                                <div className="flex sm:flex-col gap-2 shrink-0">
                                    <Button
                                        disabled={actionId === acc._id}
                                        onClick={() => handleAction(acc._id, "approve")}
                                        className="flex-1 bg-[#241E4E] hover:bg-[#2F2864] text-amber-300 font-bold rounded-xl text-xs py-2 h-10 cursor-pointer shadow-xs"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                                        Approve &amp; Activate
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={actionId === acc._id}
                                        onClick={() => handleAction(acc._id, "reject")}
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs py-2 h-10 cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                        <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                        <h3 className="font-bold text-lg text-slate-900">No Pending Savings Plans</h3>
                        <p className="text-slate-500 text-xs max-w-md mx-auto">
                            All enrolled savings plan accounts have been reviewed and activated. Newly opened accounts will queue here for admin approval.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
