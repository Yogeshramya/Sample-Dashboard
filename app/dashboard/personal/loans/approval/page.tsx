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
    Coins,
    CheckCircle2,
    XCircle,
    User,
    Shield,
    FileCheck,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanApprovalPortalPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<IPersonalLoanDocument | null>(null);

    // Sanction adjustment inputs
    const [sanctionAmount, setSanctionAmount] = useState<string>("");
    const [interestRate, setInterestRate] = useState<string>("");
    const [tenureUnits, setTenureUnits] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=VERIFIED,APPLIED");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            } else {
                toast.error(data.error || "Failed to load approval queue");
            }
        } catch {
            toast.error("Network error loading approval queue");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    const handleSelectLoan = (ln: IPersonalLoanDocument) => {
        setSelectedLoan(ln);
        setSanctionAmount(String(ln.loanAmount));
        setInterestRate(String(ln.interestRatePercent));
        setTenureUnits(String(ln.tenureUnits));
        setRemarks("Sanction approved as per credit appraisal");
    };

    const handleDecision = async (action: "APPROVE" | "REJECT") => {
        if (!selectedLoan) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${selectedLoan._id}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    approvalRemarks: remarks,
                    rejectionReason: remarks,
                    adjustedLoanAmount: Number(sanctionAmount),
                    interestRatePercent: Number(interestRate),
                    tenureUnits: Number(tenureUnits),
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Personal loan ${data.loan.status.toLowerCase()} successfully!`);
                setSelectedLoan(null);
                fetchQueue();
            } else {
                toast.error(data.error || "Approval action failed");
            }
        } catch {
            toast.error("Network error executing approval");
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
                        Manager &amp; Admin Sanction Approval Desk
                    </h1>
                    <p className="text-xs text-slate-500">
                        Final review of credit appraisal, manual sanction amount adjustment, and loan authorization
                    </p>
                </div>
            </div>

            <LoanNav />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* QUEUE TABLE */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Loans Ready for Sanction ({loans.length})
                            </h2>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3 text-left">Loan ID</th>
                                            <th className="p-3 text-left">Customer</th>
                                            <th className="p-3 text-right">Requested Principal</th>
                                            <th className="p-3 text-center">Frequency</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No loans currently pending management approval.
                                                </td>
                                            </tr>
                                        ) : (
                                            loans.map((ln) => {
                                                const cust = typeof ln.customer === "object" ? ln.customer : null;
                                                const isSelected = selectedLoan?._id === ln._id;

                                                return (
                                                    <tr
                                                        key={ln._id}
                                                        className={`hover:bg-slate-50/70 transition-colors ${
                                                            isSelected ? "bg-amber-50/60" : ""
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
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    ln.status === "VERIFIED"
                                                                        ? "bg-blue-100 text-blue-800"
                                                                        : "bg-amber-100 text-amber-800"
                                                                }`}
                                                            >
                                                                {ln.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer shadow-xs"
                                                                onClick={() => handleSelectLoan(ln)}
                                                            >
                                                                Review
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

                {/* SANCTION ADJUSTMENT & APPROVAL WORKBENCH */}
                <div>
                    {selectedLoan ? (
                        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        Sanction Workbench
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                        {selectedLoan.loanId} —{" "}
                                        {typeof selectedLoan.customer === "object"
                                            ? selectedLoan.customer.fullName
                                            : ""}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Verification Notes: <em>{selectedLoan.verificationNotes || "None"}</em>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-800">
                                            Sanctioned Amount (₹) <span className="text-amber-600">(Editable)</span>
                                        </label>
                                        <Input
                                            type="number"
                                            value={sanctionAmount}
                                            onChange={(e) => setSanctionAmount(e.target.value)}
                                            className="h-10 rounded-xl font-black text-emerald-950 bg-emerald-50/40 border-emerald-300"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-700">Interest Rate (%)</label>
                                            <Input
                                                type="number"
                                                value={interestRate}
                                                onChange={(e) => setInterestRate(e.target.value)}
                                                className="rounded-xl text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-700">Tenure Units</label>
                                            <Input
                                                type="number"
                                                value={tenureUnits}
                                                onChange={(e) => setTenureUnits(e.target.value)}
                                                className="rounded-xl text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Approval Remarks / Sanction Notes
                                        </label>
                                        <Textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="rounded-xl text-xs"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <Button
                                        onClick={() => handleDecision("APPROVE")}
                                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs h-10 cursor-pointer shadow-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        Approve &amp; Issue Sanction Order
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => handleDecision("REJECT")}
                                        className="w-full text-rose-700 border-rose-300 hover:bg-rose-50 font-bold rounded-xl text-xs h-9 cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        Reject Sanction
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Select a loan from the table to review and sanction.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

