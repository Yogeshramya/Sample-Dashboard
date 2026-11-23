"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

interface LoanProps {
    loanId: string;
    customerName: string;
    principal: number;
    interest?: number;
    savings?: number;
    paidAmount?: number;
}

interface Bill {
    _id: string;
    group?: { groupName: string };
    loans: LoanProps[];
    totalCollected: number;
    collectedAt: string;
    employee?: { name: string };
    branch?: { name: string };
}

export default function PreCloseApprovalList() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    /* ---------------- FETCH PENDING PRECLOSE BILLS ---------------- */

    useEffect(() => {
        let isMounted = true;

        async function fetchPendingPreclose() {
            try {
                const res = await fetch("/api/bill/preclose/pending");
                const data = await res.json();

                if (isMounted) {
                    if (data.success) {
                        setBills(data.bills || []);
                    } else {
                        toast.error(data.error || "Failed to load approvals");
                    }
                }
            } catch (error) {
                console.error("Fetch preclose approvals error:", error);
                if (isMounted) {
                    toast.error("Server error loading approvals");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchPendingPreclose();

        return () => {
            isMounted = false;
        };
    }, []);

    /* ---------------- APPROVE ---------------- */

    async function approve(id: string) {
        setLoadingId(id);

        try {
            const res = await fetch(`/api/bill/preclose/${id}/approve`, {
                method: "POST",
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Pre-close approved");
                setBills((prev) => prev.filter((b) => b._id !== id));
            } else {
                toast.error(data.error || "Approval failed");
            }
        } catch {
            toast.error("Approval failed due to a server error");
        } finally {
            setLoadingId(null);
        }
    }

    /* ---------------- REJECT ---------------- */

    async function reject(id: string) {
        setLoadingId(id);

        try {
            const res = await fetch(`/api/bill/preclose/${id}/reject`, {
                method: "POST",
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Pre-close rejected");
                setBills((prev) => prev.filter((b) => b._id !== id));
            } else {
                toast.error(data.error || "Rejection failed");
            }
        } catch {
            toast.error("Rejection failed due to a server error");
        } finally {
            setLoadingId(null);
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
                            <h1 className="text-3xl font-bold bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                Pre-Close Approvals
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and approve pending loan pre-closure submissions
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
                            <thead className="bg-purple-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-purple-900 border-b border-purple-100 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Loan ID</th>
                                    <th className="p-4 font-semibold">Customer</th>
                                    <th className="p-4 font-semibold">Group</th>
                                    <th className="p-4 font-semibold">Collected By</th>
                                    <th className="p-4 font-semibold">Branch</th>
                                    <th className="p-4 font-semibold text-center">Date</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && bills.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Clock className="w-8 h-8 opacity-50" />
                                                <p>No pending pre-close approvals at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {bills.map((b, index) => {
                                    const loan = b.loans?.[0];

                                    return (
                                        <motion.tr
                                            key={b._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            className="hover:bg-purple-50/30 transition-colors group"
                                        >
                                            <td className="p-4 font-mono font-medium text-gray-700">
                                                {loan?.loanId || "—"}
                                            </td>

                                            <td className="p-4 font-medium text-gray-900">
                                                {loan?.customerName || "—"}
                                            </td>

                                            <td className="p-4 text-gray-700">
                                                {b.group?.groupName || "—"}
                                            </td>

                                            <td className="p-4 text-gray-600">
                                                {b.employee?.name || "—"}
                                            </td>

                                            <td className="p-4 text-gray-600">
                                                {b.branch?.name || "—"}
                                            </td>

                                            <td className="p-4 text-center whitespace-nowrap text-gray-600">
                                                {b.collectedAt
                                                    ? new Date(b.collectedAt).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    : "—"}
                                            </td>

                                            <td className="p-4 text-right font-bold text-gray-900">
                                                ₹{b.totalCollected?.toLocaleString() || "0"}
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20"
                                                        onClick={() => approve(b._id)}
                                                        disabled={loadingId === b._id}
                                                    >
                                                        Approve
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => reject(b._id)}
                                                        disabled={loadingId === b._id}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}