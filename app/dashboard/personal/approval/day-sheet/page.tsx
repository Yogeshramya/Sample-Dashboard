"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingOverlay from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, CalendarCheck, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface CashBoxRecord {
    _id: string;
    date: string;
    openingBalance: number;
    closingBalance: number;
    branch?: { name?: string; branchName?: string };
    employee?: { name?: string };
    status: "PENDING" | "APPROVED" | "REJECTED";
    denomination?: Array<{ note: number; count: number; total: number }>;
}

export default function PersonalDaySheetApprovalPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [records, setRecords] = useState<CashBoxRecord[]>([]);

    const loadRecords = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/cashbox/approval");
            const data = await res.json();
            if (data.success) {
                setRecords(data.records || []);
            } else {
                toast.error(data.error || "Failed to load records");
            }
        } catch {
            toast.error("Error loading day sheet records");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords(true);
    }, [loadRecords]);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/cashbox/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, remarks: action === "reject" ? "Rejected" : "" }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Day Sheet ${action === "approve" ? "Approved" : "Rejected"} successfully`);
                setRecords((prev) => prev.filter((r) => r._id !== id));
            } else {
                toast.error(data.error || `Failed to ${action} day sheet`);
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActionId(null);
        }
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Smart Savings Authorization
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Day Sheet Approvals (Smart Savings)
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Review, verify cash denominations, and approve branch daily closing sheets for Smart Savings.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadRecords(true)}
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
                    Loading pending day sheets...
                </div>
            ) : records.length > 0 ? (
                <div className="space-y-4">
                    {records.map((r) => (
                        <Card key={r._id} className="p-6 bg-white border border-slate-200 hover:border-[#7C5CFC] rounded-3xl shadow-xs transition-all duration-300">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/30">
                                            {new Date(r.date).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                            {r.branch?.name || r.branch?.branchName || "Branch"}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Closed By: {r.employee?.name || "Staff"}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
                                        <span>Opening: <strong>₹{r.openingBalance?.toLocaleString("en-IN")}</strong></span>
                                        <span>•</span>
                                        <span>Closing: <strong className="text-[#241E4E] font-black">₹{r.closingBalance?.toLocaleString("en-IN")}</strong></span>
                                    </div>
                                </div>

                                {/* Denomination pill badges */}
                                {r.denomination && r.denomination.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                        {r.denomination.filter((d) => d.count > 0).map((d) => (
                                            <span key={d.note} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200/60">
                                                ₹{d.note}×{d.count}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        disabled={actionId === r._id}
                                        onClick={() => handleAction(r._id, "approve")}
                                        className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-[#7C5CFC]" />
                                        Approve Day Sheet
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={actionId === r._id}
                                        onClick={() => handleAction(r._id, "reject")}
                                        className="h-9 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">No Pending Day Sheets</h3>
                    <p className="text-xs text-slate-400">All daily closing statements for Smart Savings are verified.</p>
                </div>
            )}
        </section>
    );
}
