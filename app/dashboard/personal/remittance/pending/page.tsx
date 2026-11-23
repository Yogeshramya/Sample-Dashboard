"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, XCircle, ArrowRightLeft, Layers } from "lucide-react";
import { useRouter } from "next/navigation";

interface Remittance {
    _id: string;
    date: string;
    fromBranch: { _id: string; name?: string; branchName?: string; code?: string };
    toBranch: { _id: string; name?: string; branchName?: string; code?: string };
    fromModule?: "MFI" | "PERSONAL";
    toModule?: "MFI" | "PERSONAL";
    remittanceType?: "INTER_BRANCH" | "INTER_MODULE";
    amount: number;
    mode: "Cash" | "Bank";
    details: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestedBy?: { name?: string };
}

export default function PersonalPendingRemittancePage() {
    const router = useRouter();
    const [requests, setRequests] = useState<Remittance[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadRequests = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/remittance?status=PENDING");
            const data = await res.json();
            if (data.success) {
                setRequests(data.remittances || []);
            } else {
                toast.error(data.error || "Failed to load pending remittances");
            }
        } catch {
            toast.error("Error loading pending remittances");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests(true);
    }, [loadRequests]);

    const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/remittance/${id}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Remittance ${action === "APPROVE" ? "approved" : "rejected"} successfully`);
                await loadRequests(false);
            } else {
                toast.error(data.error || `Failed to ${action.toLowerCase()} remittance`);
            }
        } catch {
            toast.error("Network error while updating remittance");
        } finally {
            setActionId(null);
        }
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <Clock className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Pending Approval Hub
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pending Inward Remittances
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Review incoming funds transfer requests into Smart Savings before releasing into ledger balance.
                    </p>
                </div>

                <button
                    onClick={() => router.push("/dashboard/personal/remittance")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Remittances
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium text-sm animate-pulse">
                    Loading pending remittances...
                </div>
            ) : requests.length > 0 ? (
                <Card className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#241E4E] text-[#7C5CFC] border-b border-[#7C5CFC]/30 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Type</th>
                                    <th className="py-3.5 px-4">From</th>
                                    <th className="py-3.5 px-4">To</th>
                                    <th className="py-3.5 px-4 text-right">Amount</th>
                                    <th className="py-3.5 px-4 text-center">Mode</th>
                                    <th className="py-3.5 px-4">Details</th>
                                    <th className="py-3.5 px-4">Requested By</th>
                                    <th className="py-3.5 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map((item) => (
                                    <tr key={item._id} className="hover:bg-emerald-50/40 transition-colors">
                                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {item.remittanceType === "INTER_MODULE" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/30">
                                                    <Layers className="w-3 h-3 text-[#7C5CFC]" />
                                                    Inter-Module
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    Inter-Branch
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900">
                                                {item.fromBranch?.name || item.fromBranch?.branchName || "Unknown"}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                                                [{item.fromModule || "MFI"}]
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900">
                                                {item.toBranch?.name || item.toBranch?.branchName || "Unknown"}
                                            </div>
                                            <span className="text-[10px] text-amber-700 font-bold tracking-wider uppercase">
                                                [{item.toModule || "PERSONAL"}]
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-black text-sm text-[#241E4E] whitespace-nowrap font-mono">
                                            ₹{item.amount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                {item.mode}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={item.details}>
                                            {item.details}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                            {item.requestedBy?.name || "-"}
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={actionId === item._id}
                                                    onClick={() => handleAction(item._id, "APPROVE")}
                                                    className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={actionId === item._id}
                                                    onClick={() => handleAction(item._id, "REJECT")}
                                                    className="h-8 px-3 rounded-xl font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">All Remittances Approved</h3>
                    <p className="text-xs text-slate-400">There are no pending inward remittances waiting for action.</p>
                </div>
            )}
        </section>
    );
}
