"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Credit } from "@/types/credit";

export default function CreditApprovalPage() {
    const router = useRouter();
    const [credits, setCredits] = useState<Credit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchCredits() {
            try {
                const res = await fetch("/api/credit/pending");

                if (!res.ok) {
                    throw new Error("Failed to fetch credits");
                }

                const data = await res.json();
                if (isMounted) {
                    setCredits(data.credits || []);
                }
            } catch (error) {
                console.error("Fetch credits error:", error);
                if (isMounted) {
                    toast.error("Unable to load credit approvals");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchCredits();

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

                {/* Animated Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Credit Approvals
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and verify incoming credit entries
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Table Container */}
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
                                    <th className="p-4 font-semibold">Title</th>
                                    <th className="p-4 font-semibold">Details</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Mode</th>
                                    <th className="p-4 font-semibold">Entered By</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && credits.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Clock className="w-8 h-8 opacity-50" />
                                                <p>No credit entries awaiting approval at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {credits.map((c, index) => (
                                    <motion.tr
                                        key={c._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="hover:bg-orange-50/30 transition-colors group"
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-600">
                                            {new Date(c.date).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>

                                        <td className="p-4 font-medium text-gray-800">
                                            {c.title || "—"}
                                        </td>

                                        <td className="p-4 text-gray-600 max-w-xs truncate">
                                            {c.details || "—"}
                                        </td>

                                        <td className="p-4 text-right font-bold text-gray-900">
                                            ₹{Number(c.amount).toLocaleString()}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {c.mode || "—"}
                                            </span>
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {c.employee?.name || "—"}
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
                                                    router.push(`/dashboard/approval/credit/${c._id}`)
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