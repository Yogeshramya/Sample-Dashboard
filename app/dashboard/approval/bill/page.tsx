"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Bill } from "@/types/bill";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

export default function BillApprovalPage() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const res = await fetch("/api/bill/pending");
                const data = await res.json();

                if (!data.success) {
                    toast.error("Failed to load bills");
                    return;
                }

                setBills(data.bills || []);
            } catch {
                toast.error("Failed to load bills");
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <section className="max-w-7xl mx-auto space-y-8 p-4 lg:p-8">
                <PageHeader />

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-3xl font-bold bg-linear-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Bill Approvals
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Review and manage pending bill submissions
                    </p>
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
                            <thead className="bg-orange-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-orange-800 border-b border-orange-100 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Type</th>
                                    <th className="p-4 font-semibold">Group</th>
                                    <th className="p-4 font-semibold text-center">Week</th>
                                    <th className="p-4 font-semibold text-center">Members</th>
                                    <th className="p-4 font-semibold text-right">Collected</th>
                                    <th className="p-4 font-semibold">Entered By</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && bills.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Clock className="w-8 h-8 opacity-50" />
                                                <p>No bills awaiting approval at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {bills.map((b, index) => (
                                    <motion.tr
                                        key={b._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-orange-50/30 transition-colors group"
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-600">
                                            {new Date(b.collectedAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>

                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${b.type === "Normal"
                                                ? "bg-blue-50 text-blue-700"
                                                : "bg-purple-50 text-purple-700"
                                                }`}>
                                                {b.type === "Normal" ? "Normal" : "Prebill"}
                                            </span>
                                        </td>

                                        <td className="p-4 font-medium text-gray-800">
                                            {typeof b.group === "object" ? b.group?.groupName : b.group}
                                        </td>

                                        <td className="p-4 text-center text-gray-600">
                                            {b.weekNo}
                                        </td>

                                        <td className="p-4 text-center text-gray-600">
                                            {b.totalMembers}
                                        </td>

                                        <td className="p-4 text-right font-bold text-gray-900">
                                            ₹{b.totalCollected.toLocaleString()}
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {typeof b.employee === "object" ? b.employee?.name : b.employee}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                PENDING
                                            </span>
                                        </td>

                                        <td className="p-4 text-center">
                                            <Button
                                                size="sm"
                                                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-600/20 opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() =>
                                                    router.push(`/dashboard/approval/bill/${b._id}`)
                                                }
                                            >
                                                Review
                                            </Button>
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