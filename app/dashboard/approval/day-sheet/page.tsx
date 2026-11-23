"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface CashBox {
    _id: string;
    date: string;
    openingBalance: number;
    closingBalance: number;
    branch?: { name: string };
    employee?: { name: string };
    status: "PENDING" | "APPROVED" | "REJECTED";
    approvedBy?: { name: string };
    approvedAt?: string;
    remarks?: string;
    updatedAt?: string;
    createdAt?: string;
}

export default function DaySheetApprovalPage() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [records, setRecords] = useState<CashBox[]>([]);

    /* ---------------- LOAD CASHBOXES ---------------- */

    const refreshRecords = async () => {
        try {
            const res = await fetch("/api/cashbox/approval");
            const json = await res.json();

            if (json.success) {
                setRecords(json.records || []);
            } else {
                toast.error(json.error || "Failed to load records");
            }
        } catch (error) {
            console.error("Refresh cashbox approvals error:", error);
            toast.error("Failed to load records");
        }
    };

    useEffect(() => {
        let isMounted = true;

        async function fetchRecords() {
            try {
                const res = await fetch("/api/cashbox/approval");
                const json = await res.json();

                if (isMounted) {
                    if (json.success) {
                        setRecords(json.records || []);
                    } else {
                        toast.error(json.error || "Failed to load records");
                    }
                }
            } catch (error) {
                console.error("Fetch cashbox approvals error:", error);
                if (isMounted) {
                    toast.error("Failed to load records");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchRecords();

        return () => {
            isMounted = false;
        };
    }, []);

    /* ---------------- ACTIONS ---------------- */

    async function handleApprove(id: string) {
        if (!confirm("Approve this day sheet?")) return;

        setActionLoading(id);
        try {
            const res = await fetch("/api/cashbox/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            const json = await res.json();
            if (json.success) {
                toast.success("DaySheet approved");
                await refreshRecords();
            } else {
                toast.error(json.error || "Approval failed");
            }
        } catch {
            toast.error("Approval failed due to a server error");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(id: string) {
        const remarks = prompt("Reason for rejection?");
        if (!remarks) return;

        setActionLoading(id);
        try {
            const res = await fetch("/api/cashbox/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, remarks }),
            });

            const json = await res.json();
            if (json.success) {
                toast.success("DaySheet rejected");
                await refreshRecords();
            } else {
                toast.error(json.error || "Rejection failed");
            }
        } catch {
            toast.error("Rejection failed due to a server error");
        } finally {
            setActionLoading(null);
        }
    }

    /* ---------------- RENDER ---------------- */

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
                            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Day Sheet Approvals
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and verify daily cashbox and day sheet records
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
                            <thead className="bg-blue-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-blue-900 border-b border-blue-100 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold text-center">Date</th>
                                    <th className="p-4 font-semibold text-center">Time</th>
                                    <th className="p-4 font-semibold">Branch</th>
                                    <th className="p-4 font-semibold">Employee</th>
                                    <th className="p-4 font-semibold text-right">Opening</th>
                                    <th className="p-4 font-semibold text-right">Closing</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && records.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Clock className="w-8 h-8 opacity-50" />
                                                <p>No day sheets awaiting approval at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {records.map((r, index) => {
                                    const dateSource = r.updatedAt || r.date;
                                    const dateObj = dateSource ? new Date(dateSource) : null;

                                    return (
                                        <motion.tr
                                            key={r._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            {/* Date from updatedAt / date */}
                                            <td className="p-4 text-center whitespace-nowrap text-gray-700 font-medium">
                                                {dateObj
                                                    ? dateObj.toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    : "—"}
                                            </td>

                                            {/* Added Time column */}
                                            <td className="p-4 text-center whitespace-nowrap text-gray-500 font-mono text-xs">
                                                {r.updatedAt
                                                    ? new Date(r.updatedAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    })
                                                    : "—"}
                                            </td>

                                            <td className="p-4 text-gray-700 font-medium">
                                                {r.branch?.name || "—"}
                                            </td>

                                            <td className="p-4 text-gray-600">
                                                {r.employee?.name || "—"}
                                            </td>

                                            <td className="p-4 text-right font-medium text-gray-900">
                                                ₹{r.openingBalance ? r.openingBalance.toFixed(2) : "0.00"}
                                            </td>

                                            <td className="p-4 text-right font-bold text-gray-900">
                                                ₹{r.closingBalance ? r.closingBalance.toFixed(2) : "0.00"}
                                            </td>

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

                                            <td className="p-4 text-center">
                                                {r.status === "PENDING" ? (
                                                    <div className="flex justify-center items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20"
                                                            onClick={() => handleApprove(r._id)}
                                                            disabled={actionLoading === r._id}
                                                        >
                                                            Approve
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleReject(r._id)}
                                                            disabled={actionLoading === r._id}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
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