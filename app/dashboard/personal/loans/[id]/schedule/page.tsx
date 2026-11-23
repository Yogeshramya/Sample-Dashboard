"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Printer,
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Coins,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument, IPersonalLoanDueItem } from "@/types/personal-loan";

export default function LoanRepaymentSchedulePage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loan, setLoan] = useState<IPersonalLoanDocument | null>(null);

    const loadLoan = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${params.id}`);
            const data = await res.json();
            if (data.success && data.loan) {
                setLoan(data.loan);
            } else {
                toast.error(data.error || "Failed to load loan schedule");
            }
        } catch {
            toast.error("Network error loading schedule");
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        loadLoan();
    }, [loadLoan]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const formatDate = (d: string | Date | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    if (!loan && !loading) {
        return (
            <div className="p-8 text-center text-rose-600 font-semibold">
                Personal loan not found
            </div>
        );
    }

    const cust = typeof loan?.customer === "object" ? loan?.customer : null;
    const dues = (loan?.dues || []) as IPersonalLoanDueItem[];

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-2">
            <LoadingOverlay show={loading} />
            <div className="print:hidden">
                <PageHeader />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl cursor-pointer text-xs"
                        onClick={() => router.push("/dashboard/personal/loans")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            Loan Repayment Amortization Schedule
                        </h1>
                        <p className="text-xs text-slate-500">
                            Installment breakdown for {loan?.loanId} — {cust?.fullName}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                    Print Repayment Schedule
                </Button>
            </div>

            <div className="print:hidden">
                <LoanNav />
            </div>

            {/* LOAN SUMMARY HEADER CARD */}
            {loan && (
                <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-5 md:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-slate-500 font-semibold">Loan ID & Status:</span>
                            <div className="font-mono font-black text-sm text-slate-900 mt-0.5">
                                {loan.loanId}
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                {loan.status}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Borrower Name & Phone:</span>
                            <div className="font-bold text-sm text-slate-900 mt-0.5">
                                {cust?.fullName}
                            </div>
                            <div className="text-slate-500 text-[11px]">{cust?.mobile}</div>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Sanctioned Principal:</span>
                            <div className="font-black text-sm text-[#241E4E] mt-0.5">
                                {formatCurrency(loan.loanAmount)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                {loan.repaymentFrequency} • {loan.interestRatePercent}% {loan.interestType}
                            </div>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Current Outstanding:</span>
                            <div className="font-black text-sm text-rose-700 mt-0.5">
                                {formatCurrency(loan.totalOutstanding)}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-bold">
                                Repaid: {formatCurrency(loan.totalPrincipalRepaid)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AMORTIZATION DUES TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Installment Dues Schedule ({dues.length} installments)
                    </h2>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-2.5 text-center w-12">#</th>
                                    <th className="p-2.5 text-left">Due Date</th>
                                    <th className="p-2.5 text-right">Principal</th>
                                    <th className="p-2.5 text-right">Interest</th>
                                    <th className="p-2.5 text-right font-black">Total Due</th>
                                    <th className="p-2.5 text-right">Amount Paid</th>
                                    <th className="p-2.5 text-right">Balance</th>
                                    <th className="p-2.5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {dues.map((due) => (
                                    <tr
                                        key={due.installmentNo}
                                        className={`hover:bg-slate-50/70 transition-colors ${
                                            due.isPaid ? "bg-emerald-50/30" : ""
                                        }`}
                                    >
                                        <td className="p-2.5 text-center font-bold text-slate-500">
                                            {due.installmentNo}
                                        </td>
                                        <td className="p-2.5 font-semibold text-slate-800">
                                            {formatDate(due.dueDate)}
                                        </td>
                                        <td className="p-2.5 text-right text-slate-700">
                                            {formatCurrency(due.principalAmount)}
                                        </td>
                                        <td className="p-2.5 text-right text-slate-700">
                                            {formatCurrency(due.interestAmount)}
                                        </td>
                                        <td className="p-2.5 text-right font-black text-slate-900">
                                            {formatCurrency(due.totalDue)}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-emerald-800">
                                            {due.paidAmount ? formatCurrency(due.paidAmount) : "—"}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-rose-700">
                                            {formatCurrency(due.remainingAmount || 0)}
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    due.isPaid
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : due.status === "PARTIAL"
                                                          ? "bg-amber-100 text-amber-800"
                                                          : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {due.isPaid ? "PAID" : due.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

