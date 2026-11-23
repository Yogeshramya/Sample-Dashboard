"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Customer } from "@/types/customer";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

export default function ClientApprovalPage() {
    const [clients, setClients] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        async function fetchClients() {
            try {
                const res = await fetch("/api/clients/pending");
                if (!res.ok) {
                    throw new Error("Failed to load client approvals");
                }

                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.error || "Failed to load client approvals");
                }

                if (isMounted) {
                    setClients(data.clients || []);
                }
            } catch (error) {
                console.error("Fetch clients error:", error);
                if (isMounted) {
                    toast.error("Failed to load client approvals");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchClients();

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
                                Client Approvals
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Review and verify new client onboardings
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
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold text-center">Customer Code</th>
                                    <th className="p-4 font-semibold">Name</th>
                                    <th className="p-4 font-semibold text-center">Phone</th>
                                    <th className="p-4 font-semibold">Group</th>
                                    <th className="p-4 font-semibold">Entered By</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {!loading && clients.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-12 text-center text-gray-400"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Users className="w-8 h-8 opacity-50" />
                                                <p>No clients awaiting approval at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {clients.map((c, index) => (
                                    <motion.tr
                                        key={c._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="hover:bg-blue-50/30 transition-colors group"
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-600">
                                            {c.createdAt
                                                ? new Date(c.createdAt).toLocaleDateString(undefined, {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })
                                                : "—"}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700">
                                                {c.customerCode || "—"}
                                            </span>
                                        </td>

                                        <td className="p-4 font-medium text-gray-900">
                                            {c.name || "—"}
                                        </td>

                                        <td className="p-4 text-center text-gray-600 font-mono text-xs">
                                            {c.phone || "—"}
                                        </td>

                                        <td className="p-4 text-gray-700">
                                            {c.group?.groupName || "—"}
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
                                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() =>
                                                    router.push(`/dashboard/approval/client/${c._id}`)
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