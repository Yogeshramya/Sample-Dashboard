"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Debit } from "@/types/debit";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

export default function DebitApprovalPage() {
    const [debits, setDebits] = useState<Debit[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        async function fetchDebits() {
            try {
                const res = await fetch("/api/debit/pending");
                if (!res.ok) {
                    throw new Error("Failed to fetch debits");
                }
                const data = await res.json();
                if (isMounted) {
                    setDebits(data.debits || []);
                }
            } catch (error) {
                console.error("Fetch debits error:", error);
                if (isMounted) {
                    toast.error("Failed to load debit approvals");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchDebits();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <section className="max-w-7xl mx-auto space-y-8 p-4 lg:p-8">
                <PageHeader />

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3">

                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                                Debit Approvals
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and verify pending expense and debit entries
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
                            <thead className="bg-red-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-red-900 border-b border-red-100 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Title</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Mode</th>
                                    <th className="p-4 font-semibold">Entered By</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && debits.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <ReceiptText className="w-8 h-8 opacity-50" />
                                                <p>No debits awaiting approval at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {debits.map((d, index) => (
                                    <motion.tr
                                        key={d._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-red-50/30 transition-colors group"
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-600">
                                            {new Date(d.date).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>

                                        <td className="p-4 font-medium text-gray-900">
                                            {d.title}
                                        </td>

                                        <td className="p-4 text-right font-bold text-red-600">
                                            ₹ {d.amount.toLocaleString()}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                                                {d.mode}
                                            </span>
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {d.employee?.name || "—"}
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
                                                className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() =>
                                                    router.push(`/dashboard/approval/debit/${d._id}`)
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