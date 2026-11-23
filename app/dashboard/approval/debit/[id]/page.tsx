"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Debit } from "@/types/debit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CreditCard,
    FileText,
    Wallet,
    CheckCircle2,
    XCircle
} from "lucide-react";
// Import your custom overlay
import LoadingOverlay from "@/components/Loading";

export default function DebitApprovalForm() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [debit, setDebit] = useState<Debit | null>(null);
    const [remarks, setRemarks] = useState("");
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchDebit = async () => {
            try {
                const res = await fetch(`/api/debit/${id}`);
                const data = await res.json();

                if (!res.ok) throw new Error();
                setDebit(data.debit);
            } catch {
                toast.error("Debit not found");
                router.push("/dashboard/approval/debit");
            } finally {
                setLoading(false);
            }
        };
        fetchDebit();
    }, [id, router]);

    const approve = async () => {
        if (!remarks.trim()) {
            toast.error("Remarks required to approve");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/debit/approve/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remarks }),
            });

            if (res.ok) {
                toast.success("Debit Approved");
                router.push("/dashboard/approval/debit");
            } else {
                toast.error("Approval failed");
                setIsProcessing(false);
            }
        } catch {
            toast.error("An error occurred");
            setIsProcessing(false);
        }
    };

    const reject = async () => {
        if (!remarks.trim()) {
            toast.error("Remarks required to reject");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/debit/reject/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remarks }),
            });

            if (res.ok) {
                toast.success("Debit Rejected");
                router.push("/dashboard/approval/debit");
            } else {
                toast.error("Rejection failed");
                setIsProcessing(false);
            }
        } catch {
            toast.error("An error occurred");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading || isProcessing} />

            {/* Error / Not Found State */}
            {!loading && !debit && (
                <div className="flex flex-col items-center justify-center pt-32 text-gray-500 space-y-4">
                    <AlertCircle className="w-16 h-16 text-gray-400 opacity-50" />
                    <p className="text-lg">Debit details could not be found.</p>
                    <Button variant="outline" onClick={() => router.push("/dashboard/approval/debit")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Approvals
                    </Button>
                </div>
            )}

            {/* Main Content */}
            {!loading && debit && (
                <section className="max-w-5xl mx-auto p-4 lg:p-8 space-y-8">
                    {/* Header */}
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
                                    onClick={() => router.push("/dashboard/approval/debit")}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h1 className="text-3xl font-bold bg-linear-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                                    Debit Review
                                </h1>
                            </div>
                            <p className="text-gray-500 ml-11">
                                Verify expense details and provide remarks
                            </p>
                        </div>
                    </motion.div>

                    {/* Debit Info Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        <Card className="p-5 flex items-center gap-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm rounded-2xl">
                            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                                <p className="font-semibold text-gray-900 mt-0.5">
                                    {new Date(debit.date).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </Card>

                        <Card className="p-5 flex items-center gap-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm rounded-2xl">
                            <div className="p-3 rounded-xl bg-red-50 text-red-600">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</p>
                                <p className="font-bold text-red-600 text-lg mt-0.5">
                                    ₹{debit.amount.toLocaleString()}
                                </p>
                            </div>
                        </Card>

                        <Card className="p-5 flex items-center gap-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm rounded-2xl">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</p>
                                <p className="font-semibold text-gray-900 mt-0.5 uppercase">
                                    {debit.mode}
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Extended Details */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="p-6 md:p-8 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm rounded-2xl space-y-6">
                            <div>
                                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Title / Purpose
                                </div>
                                <p className="text-gray-900 text-lg ml-7">{debit.title}</p>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                                    Description
                                </div>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap ml-7">
                                    {debit.details || "No additional details provided."}
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Remarks Input */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Card className="p-6 md:p-8 bg-white shadow-lg shadow-gray-200/50 rounded-2xl border-gray-100">
                            <Label className="text-base font-semibold text-gray-700 flex items-center gap-1">
                                Reviewer Remarks <span className="text-red-500">*</span>
                            </Label>
                            <TextareaAutosize
                                minRows={4}
                                className="w-full border-2 border-gray-200 rounded-xl p-4 mt-3 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all resize-none text-gray-700"
                                placeholder="Enter justification for approval or rejection..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-100">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-14 rounded-xl text-base font-semibold"
                                    onClick={reject}
                                    disabled={isProcessing}
                                >
                                    <XCircle className="w-5 h-5 mr-2" /> Reject Debit
                                </Button>

                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 h-14 rounded-xl text-base font-semibold"
                                    onClick={approve}
                                    disabled={isProcessing}
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> Approve Debit
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </section>
            )}
        </div>
    );
}