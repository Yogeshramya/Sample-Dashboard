"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ChevronLeft, User, Phone, Building2, AlertCircle } from "lucide-react";

interface PartialPayment {
    amount: number;
    paidAt: string;
    collectedBy?: { name: string };
}

interface ArrearDetail {
    _id: string;
    mfLoanId?: string;
    arrearFromWeek: number;
    arrearTillWeek: number;
    principal: number;
    interest: number;
    savings: number;
    totalAmount: number;
    remainingAmount: number;
    status: "OPEN" | "CLOSED";
    createdAt: string;
    group?: { groupName: string; groupId?: string };
    loan?: {
        _id: string;
        mfLoanId: string;
        loanAmount?: number;
        phone?: string;
        customer?: {
            name: string;
            phone?: string;
            customerCode?: string;
        };
    };
    partialPayments: PartialPayment[];
}

export default function ArrearDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [arrear, setArrear] = useState<ArrearDetail | null>(null);
    const [amount, setAmount] = useState("");
    const [mode, setMode] = useState("Cash");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/arrear/${id}`, { cache: "no-store" });
            const data = await res.json();
            if (data.success && data.arrear) {
                setArrear(data.arrear);
            } else {
                toast.error(data.error || "Failed to load arrear details");
            }
        } catch {
            toast.error("Error connecting to server");
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    async function pay() {
        const payNum = Number(amount);
        if (!payNum || payNum <= 0) {
            toast.warning("Please enter a valid payment amount");
            return;
        }

        if (arrear && payNum > arrear.remainingAmount) {
            toast.error(`Amount cannot exceed remaining balance (₹${arrear.remainingAmount})`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/arrear/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    arrearLoanId: id,
                    amount: payNum,
                    mode,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Payment recorded successfully");
                setAmount("");
                void load();
            } else {
                toast.error(data.error || "Payment failed");
            }
        } catch {
            toast.error("Error processing payment");
        } finally {
            setSubmitting(false);
        }
    }

    if (!arrear) {
        return (
            <div className="max-w-3xl mx-auto p-6 text-center text-slate-500">
                <p>Loading arrear details...</p>
            </div>
        );
    }

    return (
        <section className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between no-print">
                <PageHeader />
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/report/arrear")}
                    className="gap-1.5"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Report
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        Arrear Loan – {arrear.loan?.mfLoanId || arrear.mfLoanId || arrear._id.slice(-6)}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Center: {arrear.group?.groupName || "Center"} | Weeks: {arrear.arrearFromWeek === arrear.arrearTillWeek ? `W${arrear.arrearFromWeek}` : `W${arrear.arrearFromWeek}–${arrear.arrearTillWeek}`}
                    </p>
                </div>

                <span
                    className={
                        arrear.status === "CLOSED"
                            ? "px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200"
                            : "px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"
                    }
                >
                    {arrear.status}
                </span>
            </div>

            {/* CUSTOMER & CENTER INFO */}
            <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border-slate-200">
                <div className="flex items-start gap-2.5">
                    <User className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {arrear.loan?.customer?.name || "Unknown"}
                        </p>
                        {arrear.loan?.customer?.customerCode && (
                            <p className="text-[10px] text-slate-500 font-mono">
                                ID: {arrear.loan.customer.customerCode}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-2.5">
                    <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            {arrear.loan?.customer?.phone || arrear.loan?.phone || "—"}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-2.5">
                    <Building2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Center</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            {arrear.group?.groupName || "—"}
                        </p>
                    </div>
                </div>
            </Card>

            {/* FINANCIAL SUMMARY */}
            <Card className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-slate-200">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Arrear</p>
                    <p className="text-xl font-bold text-slate-900">₹{arrear.totalAmount.toLocaleString("en-IN")}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining</p>
                    <p className="text-xl font-black text-red-700">₹{arrear.remainingAmount.toLocaleString("en-IN")}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Weeks</p>
                    <p className="text-xl font-bold text-slate-700">
                        {arrear.arrearFromWeek === arrear.arrearTillWeek
                            ? `Week ${arrear.arrearFromWeek}`
                            : `Weeks ${arrear.arrearFromWeek}–${arrear.arrearTillWeek}`}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
                    <p className={`text-xl font-bold ${arrear.status === "CLOSED" ? "text-green-700" : "text-amber-700"}`}>
                        {arrear.status}
                    </p>
                </div>
            </Card>

            {/* RECORD PAYMENT SECTION */}
            {arrear.status === "OPEN" && (
                <Card className="p-5 border-amber-200 bg-amber-50/40 space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Record Arrear Collection
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Amount (₹)</label>
                            <Input
                                type="number"
                                placeholder={`Up to ₹${arrear.remainingAmount}`}
                                value={amount}
                                max={arrear.remainingAmount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
                            <Select value={mode} onValueChange={setMode}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={pay}
                            disabled={submitting || !amount}
                            className="bg-red-600 hover:bg-red-700 font-bold"
                        >
                            {submitting ? "Processing..." : "Submit Collection"}
                        </Button>
                    </div>
                </Card>
            )}

            {/* PARTIAL PAYMENTS HISTORY */}
            <Card className="p-5 border-slate-200">
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-3">
                    Collection / Payment History
                </h2>

                {arrear.partialPayments && arrear.partialPayments.length > 0 ? (
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 text-left">
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Date</th>
                                <th className="border p-2">Collected By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {arrear.partialPayments.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="border p-2 font-bold text-green-700">₹{p.amount.toLocaleString("en-IN")}</td>
                                    <td className="border p-2 text-slate-600">
                                        {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "-"}
                                    </td>
                                    <td className="border p-2 font-medium text-slate-800">
                                        {p.collectedBy?.name || "Staff"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No partial payments recorded yet</p>
                )}
            </Card>
        </section>
    );
}
