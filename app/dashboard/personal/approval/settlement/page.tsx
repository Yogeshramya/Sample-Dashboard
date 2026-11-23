"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Award, RefreshCw, XCircle, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PersonalAccount } from "@/types/personal";

export default function PersonalSettlementApprovalPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadAccounts = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            // Fetch both MATURED and accounts eligible for settlement
            const res = await fetch("/api/personal/accounts?status=MATURED");
            const data = await res.json();
            if (data.success) {
                setAccounts(data.accounts || []);
            } else {
                toast.error(data.message || "Failed to load maturing accounts");
            }
        } catch {
            toast.error("Error loading maturing accounts");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts(true);
    }, [loadAccounts]);

    const handleSettle = async (id: string, newStatus: "SETTLED" | "CLOSED") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/accounts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    settledAt: new Date(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Account marked as ${newStatus} successfully!`);
                setAccounts((prev) => prev.filter((a) => a._id !== id));
            } else {
                toast.error(data.message || "Failed to settle account");
            }
        } catch {
            toast.error("Network error during settlement");
        } finally {
            setActionId(null);
        }
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <Award className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Maturity & Settlement Hub
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Savings Settlement & Maturity Approvals
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Verify deposit completion, authorize final maturity payouts, and close matured accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadAccounts(true)}
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
                    Loading accounts awaiting settlement...
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
                                    <th className="py-3.5 px-4 text-right">Bonus / Benefit</th>
                                    <th className="py-3.5 px-4 text-right">Total Payout</th>
                                    <th className="py-3.5 px-4 text-center">Maturity Date</th>
                                    <th className="py-3.5 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map((acc) => (
                                    <tr key={acc._id} className="hover:bg-emerald-50/40 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                                            {acc.accountNumber}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900">{acc.customer?.fullName}</div>
                                            <span className="text-[10px] text-slate-400">{acc.customer?.mobile}</span>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">
                                            {acc.scheme?.schemeName || "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span className="font-bold text-slate-700">
                                                {acc.paidInstallments} / {acc.totalTargetInstallments}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block uppercase">
                                                {acc.frequency}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                            ₹{acc.totalDeposited?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-[#241E4E] whitespace-nowrap">
                                            +₹{acc.benefitAmount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-sm text-[#241E4E] whitespace-nowrap">
                                            ₹{acc.maturityAmount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600">
                                            {new Date(acc.maturityDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={actionId === acc._id}
                                                    onClick={() => handleSettle(acc._id, "SETTLED")}
                                                    className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5 text-[#7C5CFC]" />
                                                    Approve Payout
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionId === acc._id}
                                                    onClick={() => handleSettle(acc._id, "CLOSED")}
                                                    className="h-8 px-3 rounded-xl font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Close
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
                    <h3 className="text-base font-bold text-slate-800">No Pending Settlements</h3>
                    <p className="text-xs text-slate-400">All matured Smart Savings accounts have been settled and closed.</p>
                </div>
            )}
        </section>
    );
}
