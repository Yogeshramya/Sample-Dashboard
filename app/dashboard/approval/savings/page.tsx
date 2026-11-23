"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

interface SavingsApproval {
    _id: string;
    savingsAmount: number;
    createdAt: string;
    status: "PENDING" | "APPROVED" | "REJECTED";

    customer: {
        _id: string;
        name: string;
        phone: string;
    };

    loan?: {
        _id: string;
        mfLoanId?: string;
        group?: {
            groupName: string;
        };
    };

    requestedBy: {
        name: string;
    };
}

export default function SavingsApprovalPage() {
    const [records, setRecords] = useState<SavingsApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    /* ---------- LOAD APPROVALS ---------- */
    const fetchApprovals = async (isMounted = true) => {
        try {
            const res = await fetch("/api/savings/approval");
            const data = await res.json();
            if (isMounted) {
                setRecords(data.records || []);
            }
        } catch {
            if (isMounted) {
                toast.error("Failed to load approvals");
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            await fetchApprovals(isMounted);
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    /* ---------- ACTIONS ---------- */
    async function handleApprove(id: string) {
        setActionLoading(id);
        try {
            const res = await fetch("/api/savings/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                throw new Error("Approval failed");
            }

            toast.success("Savings return approved");
            await fetchApprovals();
        } catch {
            toast.error("Approval failed");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(id: string) {
        setActionLoading(id);
        try {
            const res = await fetch("/api/savings/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                throw new Error("Rejection failed");
            }

            toast.success("Savings return rejected");
            await fetchApprovals();
        } catch {
            toast.error("Rejection failed");
        } finally {
            setActionLoading(null);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <section className="max-w-7xl mx-auto space-y-8 p-4 lg:p-8">
                <PageHeader />

                {/* Animated Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3">

                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Savings Return Approval
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and authorize pending customer savings return requests
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Premium Table Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden"
                >
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-green-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-green-900 border-b border-green-100 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Customer</th>
                                    <th className="p-4 font-semibold">Group</th>
                                    <th className="p-4 font-semibold text-center">Requested By</th>
                                    <th className="p-4 font-semibold text-center">Date</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && records.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Clock className="w-8 h-8 opacity-50" />
                                                <p>No pending savings return approvals at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {records.map((r, index) => (
                                    <motion.tr
                                        key={r._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="hover:bg-green-50/30 transition-colors group"
                                    >
                                        {/* Customer */}
                                        <td className="p-4 font-medium text-gray-900">
                                            {r.customer?.name || "—"}
                                        </td>

                                        {/* Group */}
                                        <td className="p-4 text-gray-600">
                                            {r.loan?.group?.groupName || "—"}
                                        </td>

                                        {/* Requested By */}
                                        <td className="p-4 text-center text-gray-600">
                                            {r.requestedBy?.name || "—"}
                                        </td>

                                        {/* Date */}
                                        <td className="p-4 text-center whitespace-nowrap text-gray-600">
                                            {new Date(r.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>

                                        {/* Amount */}
                                        <td className="p-4 text-right font-bold text-gray-900">
                                            ₹{r.savingsAmount?.toLocaleString() || "0"}
                                        </td>

                                        {/* Status */}
                                        <td className="p-4 text-center">
                                            {r.status === "PENDING" && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                    PENDING
                                                </span>
                                            )}
                                            {r.status === "APPROVED" && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    APPROVED
                                                </span>
                                            )}
                                            {r.status === "REJECTED" && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    REJECTED
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-center">
                                            {r.status === "PENDING" ? (
                                                <div className="flex justify-center items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20"
                                                        disabled={actionLoading === r._id}
                                                        onClick={() => handleApprove(r._id)}
                                                    >
                                                        Approve
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={actionLoading === r._id}
                                                        onClick={() => handleReject(r._id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}