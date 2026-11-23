"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Printer,
    ArrowLeft,
    CheckCircle2,
    Calendar,
    Coins,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument, IPersonalLoanCollectionDocument } from "@/types/personal-loan";

export default function LoanLedgerStatementPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loan, setLoan] = useState<IPersonalLoanDocument | null>(null);
    const [collections, setCollections] = useState<IPersonalLoanCollectionDocument[]>([]);

    const loadLedger = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${params.id}`);
            const data = await res.json();
            if (data.success && data.loan) {
                setLoan(data.loan);
                setCollections(data.collections || []);
            } else {
                toast.error(data.error || "Failed to load loan ledger");
            }
        } catch {
            toast.error("Network error loading ledger");
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        loadLedger();
    }, [loadLedger]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const formatDate = (d: string | Date | null | undefined) => {
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
                Personal loan account not found
            </div>
        );
    }

    const cust = typeof loan?.customer === "object" ? loan?.customer : null;

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
                            Personal Loan Financial Statement / Passbook
                        </h1>
                        <p className="text-xs text-slate-500">
                            Chronological statement of disbursements and installment collections for {loan?.loanId}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                    Print Passbook Statement
                </Button>
            </div>

            <div className="print:hidden">
                <LoanNav />
            </div>

            {/* ACCOUNT HEADER CARD */}
            {loan && (
                <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-5 md:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-slate-500 font-semibold">Loan ID:</span>
                            <div className="font-mono font-black text-base text-slate-900 mt-0.5">
                                {loan.loanId}
                            </div>
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                {loan.status}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Borrower:</span>
                            <div className="font-bold text-sm text-slate-900 mt-0.5">
                                {cust?.fullName}
                            </div>
                            <div className="text-slate-500 text-[11px]">{cust?.mobile}</div>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Sanction Principal:</span>
                            <div className="font-black text-sm text-[#241E4E] mt-0.5">
                                {formatCurrency(loan.loanAmount)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                Disbursed: {formatDate(loan.disbursedAt)}
                            </div>
                        </div>

                        <div>
                            <span className="text-slate-500 font-semibold">Current Balance:</span>
                            <div className="font-black text-sm text-rose-700 mt-0.5">
                                {formatCurrency(loan.totalOutstanding)}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-bold">
                                Recovered: {formatCurrency(loan.totalPrincipalRepaid)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* PASSBOOK LEDGER TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Passbook Transaction Ledger ({collections.length + (loan?.disbursedAt ? 1 : 0)} entries)
                    </h2>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-2.5 text-left">Date</th>
                                    <th className="p-2.5 text-left">Description / Voucher</th>
                                    <th className="p-2.5 text-center">Mode</th>
                                    <th className="p-2.5 text-right text-rose-300">Debit (Payout)</th>
                                    <th className="p-2.5 text-right text-emerald-300">Credit (Inflow)</th>
                                    <th className="p-2.5 text-right font-black">Principal Split</th>
                                    <th className="p-2.5 text-right font-black">Interest Split</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {/* INITIAL DISBURSEMENT DEBIT ROW */}
                                {loan?.disbursedAt && (
                                    <tr className="bg-rose-50/20">
                                        <td className="p-2.5 font-semibold text-slate-800">
                                            {formatDate(loan.disbursedAt)}
                                        </td>
                                        <td className="p-2.5">
                                            <div className="font-bold text-slate-900">Loan Disbursement</div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                                {loan.disbursementVoucherNo || "Initial Disbursement"}
                                            </div>
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                {loan.disbursementMethod || "CASH"}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-right font-black text-rose-700">
                                            {formatCurrency(loan.netDisbursedAmount || loan.loanAmount)}
                                        </td>
                                        <td className="p-2.5 text-right text-slate-400">—</td>
                                        <td className="p-2.5 text-right text-slate-400">—</td>
                                        <td className="p-2.5 text-right text-slate-400">—</td>
                                    </tr>
                                )}

                                {/* COLLECTION CREDIT ROWS */}
                                {collections.map((col) => {
                                    const colBy = typeof col.collectedBy === "object" ? col.collectedBy?.name : "Staff";

                                    return (
                                        <tr key={col._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-2.5 font-semibold text-slate-800">
                                                {formatDate(col.transactionDate)}
                                            </td>
                                            <td className="p-2.5">
                                                <div className="font-bold text-slate-900">
                                                    {col.collectionType === "DAILY"
                                                        ? "Daily Installment Collection"
                                                        : col.collectionType === "PRECLOSURE_SETTLEMENT"
                                                          ? "Pre-closure Settlement"
                                                          : "EMI Repayment"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    {col.receiptNo} • Collected by: {colBy}
                                                </div>
                                            </td>
                                            <td className="p-2.5 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {col.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-right text-slate-400">—</td>
                                            <td className="p-2.5 text-right font-black text-emerald-800">
                                                {formatCurrency(col.totalAmount)}
                                            </td>
                                            <td className="p-2.5 text-right font-semibold text-slate-800">
                                                {formatCurrency(col.principalPortion)}
                                            </td>
                                            <td className="p-2.5 text-right font-semibold text-amber-700">
                                                {formatCurrency(col.interestPortion)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
