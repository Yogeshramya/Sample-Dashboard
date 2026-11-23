"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Users,
    Calendar,
    UserCircle,
    Clock,
    AlertCircle
} from "lucide-react";
// Import your custom overlay
import LoadingOverlay from "@/components/Loading";

interface LoanEntry {
    loanId: string;
    customerName: string;
    weekNo: number;
    paidAmount: number;
    principal: number;
    interest: number;
    savings: number;
    present: boolean;
}

interface Bill {
    _id: string;
    weekNo: number;
    totalCollected: number;
    collectedAt: string;
    employee?: { name: string };
    group?: { groupName: string };
    loans: LoanEntry[];
}

export default function BillReviewPage() {
    const { id } = useParams();
    const router = useRouter();

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        async function fetchBill() {
            try {
                const res = await fetch(`/api/bill/${id}`);
                const data = await res.json();

                if (!data.success) {
                    toast.error("Failed to load bill");
                    return;
                }

                setBill(data.bill);
            } catch {
                toast.error("Failed to load bill");
            } finally {
                setLoading(false);
            }
        }

        fetchBill();
    }, [id]);

    async function approveBill() {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/bill/${id}/approve`, {
                method: "POST",
            });

            if (res.ok) {
                toast.success("Bill approved successfully");
                router.push("/dashboard/approval/bill");
            } else {
                toast.error("Failed to approve bill");
                setIsProcessing(false);
            }
        } catch {
            toast.error("An error occurred");
            setIsProcessing(false);
        }
    }

    async function rejectBill() {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/bill/${id}/reject`, {
                method: "POST",
            });

            if (res.ok) {
                toast.success("Bill rejected");
                router.push("/dashboard/approval/bill");
            } else {
                toast.error("Failed to reject bill");
                setIsProcessing(false);
            }
        } catch {
            toast.error("An error occurred");
            setIsProcessing(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading || isProcessing} />

            {/* Error / Not Found State */}
            {!loading && !bill && (
                <div className="flex flex-col items-center justify-center pt-32 text-gray-500 space-y-4">
                    <AlertCircle className="w-16 h-16 text-gray-400 opacity-50" />
                    <p className="text-lg">Bill details could not be found.</p>
                    <Button variant="outline" onClick={() => router.push("/dashboard/approval/bill")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Approvals
                    </Button>
                </div>
            )}

            {/* Main Content */}
            {!loading && bill && (
                <section className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
                    <PageHeader />

                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center justify-between"
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-gray-200"
                                    onClick={() => router.push("/dashboard/approval/bill")}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h1 className="text-3xl font-bold bg-linear-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                    Bill Review
                                </h1>
                            </div>
                            <p className="text-gray-500 ml-11">
                                Verify collection details before final approval
                            </p>
                        </div>
                    </motion.div>

                    {/* Bill Info Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {[
                            { label: "Group", value: bill.group?.groupName, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
                            { label: "Week No", value: bill.weekNo, icon: Calendar, color: "text-purple-500", bg: "bg-purple-50" },
                            { label: "Entered By", value: bill.employee?.name, icon: UserCircle, color: "text-amber-500", bg: "bg-amber-50" },
                            { label: "Date", value: new Date(bill.collectedAt).toLocaleDateString(), icon: Clock, color: "text-emerald-500", bg: "bg-emerald-50" }
                        ].map((stat, idx) => (
                            <Card key={idx} className="p-5 flex items-center gap-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                    <p className="font-semibold text-gray-900 mt-0.5 truncate max-w-30">{stat.value || "N/A"}</p>
                                </div>
                            </Card>
                        ))}
                    </motion.div>

                    {/* Members Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Card className="bg-white shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-blue-50/50 sticky top-0 z-10 backdrop-blur-md">
                                        <tr className="text-blue-900 border-b border-blue-100 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Customer</th>
                                            <th className="p-4 font-semibold">Loan ID</th>
                                            <th className="p-4 font-semibold text-center">Week</th>
                                            <th className="p-4 font-semibold text-right">Principal</th>
                                            <th className="p-4 font-semibold text-right">Interest</th>
                                            <th className="p-4 font-semibold text-right">Savings</th>
                                            <th className="p-4 font-semibold text-right">Paid</th>
                                            <th className="p-4 font-semibold text-center">Present</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-50">
                                        {bill.loans.map((l, i) => (
                                            <motion.tr
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 + (i * 0.05) }}
                                                className="hover:bg-blue-50/30 transition-colors"
                                            >
                                                <td className="p-4 font-medium text-gray-800 whitespace-nowrap">
                                                    {l.customerName}
                                                </td>
                                                <td className="p-4 text-gray-500 text-xs font-mono">
                                                    {l.loanId}
                                                </td>
                                                <td className="p-4 text-center text-gray-600">
                                                    {bill.weekNo}
                                                </td>
                                                <td className="p-4 text-right text-gray-600">
                                                    ₹{l.principal.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right text-gray-600">
                                                    ₹{l.interest.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right text-gray-600">
                                                    ₹{l.savings.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right font-bold text-green-600">
                                                    ₹{l.paidAmount.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {l.present ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            YES
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                            NO
                                                        </span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Action Summary Footer */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Card className="p-6 rounded-2xl border-gray-100 shadow-lg bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Collection Amount</p>
                                <div className="text-3xl font-bold text-gray-900">
                                    ₹{bill.totalCollected.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-12 px-6 rounded-xl"
                                    onClick={rejectBill}
                                    disabled={isProcessing}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>

                                <Button
                                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 h-12 px-8 rounded-xl text-base"
                                    onClick={approveBill}
                                    disabled={isProcessing}
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> Approve Bill
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </section>
            )}
        </div>
    );
}