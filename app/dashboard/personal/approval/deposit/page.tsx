"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Receipt,
    RefreshCw,
    Search,
    ShieldCheck,
    Coins,
    User,
    Calendar,
    Wallet,
    Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PendingDeposit {
    _id: string;
    receiptNo: string;
    branchId?: {
        _id: string;
        name: string;
    } | string;
    account?: {
        _id: string;
        accountNumber: string;
        frequency: string;
        installmentAmount: number;
        totalDeposited: number;
        maturityAmount: number;
        scheme?: {
            _id: string;
            name: string;
        };
    };
    customer?: {
        _id: string;
        clientId: string;
        fullName: string;
        mobile: string;
    };
    collectedBy?: {
        _id: string;
        name: string;
    };
    installmentCount: number;
    amount: number;
    paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER";
    depositDate: string;
    remarks?: string;
    createdAt: string;
}

export default function PersonalDepositApprovalPage() {
    const router = useRouter();
    const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [search, setSearch] = useState("");
    const [rejectModal, setRejectModal] = useState<{ id: string; receiptNo: string } | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const loadDeposits = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/deposits/pending?branchId=ALL");
            const data = await res.json();
            if (data.success) {
                setDeposits(data.deposits || []);
            } else {
                toast.error(data.error || "Failed to load pending deposits");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDeposits(true);
    }, [loadDeposits]);

    const handleApprove = async (id: string) => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/deposits/${id}/approve`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Deposit approved and credited successfully");
                setDeposits((prev) => prev.filter((d) => d._id !== id));
            } else {
                toast.error(data.error || "Failed to approve deposit");
            }
        } catch {
            toast.error("Network error while approving");
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setActionId(rejectModal.id);
        try {
            const res = await fetch(`/api/personal/deposits/${rejectModal.id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Deposit rejected");
                setDeposits((prev) => prev.filter((d) => d._id !== rejectModal.id));
                setRejectModal(null);
                setRejectReason("");
            } else {
                toast.error(data.error || "Failed to reject deposit");
            }
        } catch {
            toast.error("Network error while rejecting");
        } finally {
            setActionId(null);
        }
    };

    const handleBulkApprove = async () => {
        if (deposits.length === 0) return;
        if (!confirm(`Are you sure you want to approve all ${deposits.length} pending deposits?`)) {
            return;
        }

        setBulkProcessing(true);
        try {
            const res = await fetch("/api/personal/deposits/bulk-approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    depositIds: deposits.map((d) => d._id),
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "All deposits approved successfully!");
                setDeposits([]);
            } else {
                toast.error(data.error || "Bulk approval failed");
            }
        } catch {
            toast.error("Network error during bulk approval");
        } finally {
            setBulkProcessing(false);
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return deposits;
        const q = search.toLowerCase();
        return deposits.filter(
            (d) =>
                d.receiptNo.toLowerCase().includes(q) ||
                d.account?.accountNumber.toLowerCase().includes(q) ||
                d.customer?.fullName.toLowerCase().includes(q) ||
                d.customer?.clientId.toLowerCase().includes(q) ||
                d.customer?.mobile.includes(q) ||
                d.collectedBy?.name.toLowerCase().includes(q)
        );
    }, [deposits, search]);

    const totalFilteredAmount = useMemo(
        () => filtered.reduce((s, d) => s + (d.amount || 0), 0),
        [filtered]
    );

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <Receipt className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Member Savings Collections
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pending Deposit Approvals
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Verify and authorize daily/weekly installment collections before posting to customer balances and reports.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {deposits.length > 0 && (
                        <Button
                            onClick={handleBulkApprove}
                            disabled={bulkProcessing || loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {bulkProcessing ? "Approving All..." : `Approve All (${deposits.length})`}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => loadDeposits(true)}
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

            {/* Metrics Ribbon & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-[#241E4E] to-[#2F2864] text-emerald-50 border border-[#7C5CFC]/30 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-emerald-200/80 uppercase tracking-wider">Awaiting Verification</p>
                        <h3 className="text-2xl font-black text-[#7C5CFC] mt-0.5">{deposits.length}</h3>
                        <p className="text-[11px] text-emerald-300/70 mt-0.5">Pending collection entries</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                        <Coins className="w-6 h-6 text-[#7C5CFC]" />
                    </div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pending Collection</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{totalFilteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Awaiting credit to customer ledgers</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-amber-600" />
                    </div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-center">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search receipt, member, account..."
                            className="pl-9 h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-[#7C5CFC]"
                        />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
                        Showing {filtered.length} of {deposits.length} record(s)
                    </p>
                </Card>
            </div>

            {/* Main Table */}
            <Card className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#241E4E] text-emerald-100 uppercase font-bold text-[10px] tracking-wider border-b border-emerald-900">
                            <tr>
                                <th className="p-3.5 pl-4">Receipt & Date</th>
                                <th className="p-3.5">Customer / Member</th>
                                <th className="p-3.5">Account & Scheme</th>
                                <th className="p-3.5 text-center">Installments</th>
                                <th className="p-3.5 text-right">Amount (₹)</th>
                                <th className="p-3.5 text-center">Payment Mode</th>
                                <th className="p-3.5">Collected By</th>
                                <th className="p-3.5">Remarks</th>
                                <th className="p-3.5 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="w-6 h-6 animate-spin text-[#7C5CFC]" />
                                            <span>Loading pending deposits...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                                <ShieldCheck className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">All Deposits Cleared!</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    There are no pending member deposit entries awaiting administrator approval.
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((d) => {
                                    const isBusy = actionId === d._id || bulkProcessing;
                                    return (
                                        <tr key={d._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3.5 pl-4">
                                                <span className="font-mono font-bold text-slate-900 block">
                                                    {d.receiptNo}
                                                </span>
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {new Date(d.depositDate).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    {d.customer?.fullName || "—"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 pl-5">
                                                    ID: <span className="font-mono text-slate-700">{d.customer?.clientId || "—"}</span>
                                                    {d.customer?.mobile ? ` • ${d.customer.mobile}` : ""}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-mono font-bold text-emerald-950 flex items-center gap-1">
                                                    <Wallet className="w-3 h-3 text-[#7C5CFC]" />
                                                    {d.account?.accountNumber || "—"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Layers className="w-3 h-3 text-slate-400" />
                                                    <span>{d.account?.scheme?.name || "Savings Plan"}</span>
                                                    <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-100 font-semibold text-slate-600">
                                                        {d.account?.frequency}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                                    {d.installmentCount}
                                                </span>
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <span className="font-mono font-black text-slate-950 text-sm">
                                                    ₹{d.amount.toFixed(2)}
                                                </span>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        d.paymentMethod === "CASH"
                                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                            : d.paymentMethod === "UPI"
                                                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                                                            : "bg-purple-50 text-purple-800 border border-purple-200"
                                                    }`}
                                                >
                                                    {d.paymentMethod}
                                                </span>
                                            </td>

                                            <td className="p-3.5 text-slate-700">
                                                {d.collectedBy?.name || "Self / Branch"}
                                            </td>

                                            <td className="p-3.5 text-slate-500 max-w-[140px] truncate">
                                                {d.remarks || "—"}
                                            </td>

                                            <td className="p-3.5 text-right pr-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(d._id)}
                                                        disabled={isBusy}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Approve
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setRejectModal({ id: d._id, receiptNo: d.receiptNo })}
                                                        disabled={isBusy}
                                                        className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs h-7 px-2.5 rounded-lg cursor-pointer flex items-center gap-1"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Reject Deposit Entry</h3>
                                <p className="text-xs text-slate-500 font-mono">{rejectModal.receiptNo}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600">
                            Please provide a reason for rejecting this deposit. The deposit will be flagged as rejected and will not credit the member&apos;s account.
                        </p>

                        <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Rejection Reason
                            </label>
                            <Input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g., Incorrect amount entered, Duplicate entry..."
                                className="text-xs rounded-xl"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRejectModal(null);
                                    setRejectReason("");
                                }}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleReject}
                                disabled={actionId !== null}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

