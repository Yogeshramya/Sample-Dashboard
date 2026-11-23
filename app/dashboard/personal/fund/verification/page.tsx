"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Eye,
    User,
    Phone,
    MapPin,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanVerificationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<IPersonalLoanDocument | null>(null);
    const [notes, setNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    // Verification checklist state
    const [checkAddress, setCheckAddress] = useState(false);
    const [checkIncome, setCheckIncome] = useState(false);
    const [checkPassbook, setCheckPassbook] = useState(false);
    const [checkGuarantor, setCheckGuarantor] = useState(false);

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=APPLIED,PENDING_VERIFICATION");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            } else {
                toast.error(data.error || "Failed to load verification queue");
            }
        } catch {
            toast.error("Network error loading verification queue");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const handleOpenVerification = (ln: IPersonalLoanDocument) => {
        setSelectedLoan(ln);
        setNotes(ln.verificationNotes || "");
        setCheckAddress(false);
        setCheckIncome(false);
        setCheckPassbook(false);
        setCheckGuarantor(false);
        setRejectionReason("");
    };

    const handleAction = async (action: "VERIFY" | "REJECT" | "RETURN") => {
        if (!selectedLoan) return;

        if (action === "VERIFY" && (!checkAddress || !checkIncome || !checkPassbook || !checkGuarantor)) {
            return toast.error("Please complete all verification checklist items before verifying");
        }
        if (action === "REJECT" && !rejectionReason.trim()) {
            return toast.error("Please provide a reason for rejecting this application");
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${selectedLoan._id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    verificationNotes: notes,
                    rejectionReason,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Application marked as ${data.loan.status}`);
                setSelectedLoan(null);
                fetchPending();
            } else {
                toast.error(data.error || "Failed to update verification status");
            }
        } catch {
            toast.error("Network error updating verification");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Loan Field &amp; Document Verification Desk
                    </h1>
                    <p className="text-xs text-slate-500">
                        Review customer applications, verify residence, income, passbook, and guarantor details
                    </p>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PENDING LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Applications Awaiting Verification ({loans.length})
                            </h2>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3 text-left">Loan ID</th>
                                            <th className="p-3 text-left">Customer</th>
                                            <th className="p-3 text-right">Requested Amount</th>
                                            <th className="p-3 text-center">Frequency</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No applications currently awaiting verification.
                                                </td>
                                            </tr>
                                        ) : (
                                            loans.map((ln) => {
                                                const cust = typeof ln.customer === "object" ? ln.customer : null;
                                                const isSelected = selectedLoan?._id === ln._id;

                                                return (
                                                    <tr
                                                        key={ln._id}
                                                        className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-emerald-50/50" : ""
                                                            }`}
                                                    >
                                                        <td className="p-3 font-mono font-bold text-slate-900">
                                                            {ln.loanId}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-bold text-slate-900">{cust?.fullName || "—"}</div>
                                                            <div className="text-[10px] text-slate-500">{cust?.mobile}</div>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-[#241E4E]">
                                                            {formatCurrency(ln.loanAmount)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                {ln.repaymentFrequency}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                {ln.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 text-[11px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                                                onClick={() => handleOpenVerification(ln)}
                                                            >
                                                                Verify
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* VERIFICATION ACTION PANEL */}
                <div>
                    {selectedLoan ? (
                        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        Verification Checklist
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                        {selectedLoan.loanId} —{" "}
                                        {typeof selectedLoan.customer === "object"
                                            ? selectedLoan.customer.fullName
                                            : ""}
                                    </div>
                                    <div className="text-xs font-bold text-emerald-700">
                                        Sanction Amount: {formatCurrency(selectedLoan.loanAmount)}
                                    </div>
                                </div>

                                {/* CHECKLIST */}
                                <div className="space-y-2.5 text-xs">
                                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checkAddress}
                                            onChange={(e) => setCheckAddress(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                        <span className="font-semibold text-slate-800">
                                            Residence / Physical Address Verified
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checkIncome}
                                            onChange={(e) => setCheckIncome(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                        <span className="font-semibold text-slate-800">
                                            Income / Business Occupation Verified
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checkPassbook}
                                            onChange={(e) => setCheckPassbook(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                        <span className="font-semibold text-slate-800">
                                            Savings Scheme Passbook Cross-Checked
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checkGuarantor}
                                            onChange={(e) => setCheckGuarantor(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                        <span className="font-semibold text-slate-800">
                                            Guarantor Consent &amp; Contact Verified ({selectedLoan.guarantorName})
                                        </span>
                                    </label>
                                </div>

                                {/* NOTES */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Verification Officer Notes
                                    </label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add field observations or verification remarks..."
                                        className="text-xs rounded-xl"
                                        rows={3}
                                    />
                                </div>

                                {/* REJECTION REASON (OPTIONAL) */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Rejection Reason (if rejecting)
                                    </label>
                                    <Input
                                        type="text"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Specify reason for denial..."
                                        className="text-xs rounded-xl"
                                    />
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <Button
                                        onClick={() => handleAction("VERIFY")}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs h-10 cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        Pass &amp; Recommend for Approval
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleAction("RETURN")}
                                            className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold rounded-xl text-xs h-9 cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                            Return
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleAction("REJECT")}
                                            className="text-rose-700 border-rose-300 hover:bg-rose-50 font-bold rounded-xl text-xs h-9 cursor-pointer"
                                        >
                                            <XCircle className="w-3.5 h-3.5 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Select an application from the table to complete field verification.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

