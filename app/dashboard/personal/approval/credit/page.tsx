"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, TrendingUp, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreditItem {
    _id: string;
    creditCode: string;
    date: string;
    title: { title: string } | string;
    amount: number;
    paymentMode: string;
    details: string;
    enteredBy?: { name?: string };
    status: string;
}

export default function PersonalCreditApprovalPage() {
    const router = useRouter();
    const [credits, setCredits] = useState<CreditItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadCredits = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/credit?status=PENDING&limit=100");
            const data = await res.json();
            if (data.success) {
                setCredits(data.credits || []);
            } else {
                toast.error(data.error || "Failed to load pending incomes");
            }
        } catch {
            toast.error("Error loading pending incomes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCredits(true);
    }, [loadCredits]);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/credit/${action}/${id}`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Income ${action === "approve" ? "approved" : "rejected"} successfully`);
                setCredits((prev) => prev.filter((c) => c._id !== id));
            } else {
                toast.error(data.error || `Failed to ${action} income`);
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActionId(null);
        }
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <TrendingUp className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Savings Miscellaneous Incomes
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pending Income Approvals
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Verify and authorize non-deposit income entries credited into the Smart Savings ledger.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadCredits(true)}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <button
                        onClick={() => router.push("/dashboard/personal/approval")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Approvals
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium text-sm animate-pulse">
                    Loading pending incomes...
                </div>
            ) : credits.length > 0 ? (
                <Card className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#241E4E] text-[#7C5CFC] border-b border-[#7C5CFC]/30 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Code</th>
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Category / Title</th>
                                    <th className="py-3.5 px-4 text-right">Amount</th>
                                    <th className="py-3.5 px-4 text-center">Mode</th>
                                    <th className="py-3.5 px-4">Details</th>
                                    <th className="py-3.5 px-4">Entered By</th>
                                    <th className="py-3.5 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {credits.map((item) => {
                                    const titleStr = typeof item.title === "object" && item.title !== null
                                        ? item.title.title
                                        : String(item.title || "-");
                                    return (
                                        <tr key={item._id} className="hover:bg-emerald-50/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                                                {item.creditCode}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                                                {new Date(item.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {titleStr}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-sm text-[#241E4E] whitespace-nowrap">
                                                ₹{item.amount?.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                                    {item.paymentMode}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate" title={item.details}>
                                                {item.details || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                                {item.enteredBy?.name || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={actionId === item._id}
                                                        onClick={() => handleAction(item._id, "approve")}
                                                        className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={actionId === item._id}
                                                        onClick={() => handleAction(item._id, "reject")}
                                                        className="h-8 px-3 rounded-xl font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">All Incomes Clear</h3>
                    <p className="text-xs text-slate-400">There are no pending Smart Savings incomes waiting for authorization.</p>
                </div>
            )}
        </section>
    );
}
