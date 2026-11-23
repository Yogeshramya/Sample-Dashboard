"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Banknote,
    Coins,
    CheckCircle2,
    Calendar,
    ArrowRight,
    AlertTriangle,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanDisbursementPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<IPersonalLoanDocument | null>(null);

    // Disbursement form
    const [disbursementMethod, setDisbursementMethod] = useState<"CASH" | "BANK_TRANSFER" | "UPI">("CASH");
    const [voucherNo, setVoucherNo] = useState("");
    const [bankReference, setBankReference] = useState("");
    const [firstDueDate, setFirstDueDate] = useState("");

    const fetchApproved = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=APPROVED");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            } else {
                toast.error(data.error || "Failed to load approved loans");
            }
        } catch {
            toast.error("Network error loading approved loans");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApproved();
    }, [fetchApproved]);

    const handleSelectLoan = (ln: IPersonalLoanDocument) => {
        setSelectedLoan(ln);
        setVoucherNo(`PV-${ln.loanId}`);
        setBankReference("");
        const d = new Date();
        if (ln.repaymentFrequency === "DAILY") {
            d.setDate(d.getDate() + 1);
        } else if (ln.repaymentFrequency === "WEEKLY") {
            d.setDate(d.getDate() + 7);
        } else {
            d.setMonth(d.getMonth() + 1);
        }
        setFirstDueDate(d.toISOString().split("T")[0]);
    };

    const handleDisburse = async () => {
        if (!selectedLoan) return;

        if (disbursementMethod !== "CASH" && !bankReference.trim()) {
            return toast.error("Bank Reference / Transaction ID is required for non-cash disbursement");
        }

        if (
            !confirm(
                `Confirm payout of ${formatCurrency(selectedLoan.netDisbursedAmount || selectedLoan.loanAmount)} via ${disbursementMethod}? This will record a DEBIT in the Day Sheet.`
            )
        ) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${selectedLoan._id}/disburse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    disbursementMethod,
                    disbursementVoucherNo: voucherNo,
                    bankReferenceNumber: bankReference,
                    firstDueDate,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Personal loan disbursed successfully! Day Sheet debited.");
                setSelectedLoan(null);
                fetchApproved();
            } else {
                toast.error(data.error || "Disbursement failed");
            }
        } catch {
            toast.error("Network error during disbursement");
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
                        Personal Loan Cash &amp; Bank Disbursement
                    </h1>
                    <p className="text-xs text-slate-500">
                        Execute sanctioned loan payouts, generate disbursement vouchers, and register Daysheet Debits
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
                                Sanctioned Loans Awaiting Payout ({loans.length})
                            </h2>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3 text-left">Loan ID</th>
                                            <th className="p-3 text-left">Customer</th>
                                            <th className="p-3 text-right">Sanction Amount</th>
                                            <th className="p-3 text-right">Net Payout</th>
                                            <th className="p-3 text-center">Frequency</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No approved loans currently awaiting disbursement.
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
                                                            isSelected ? "bg-emerald-50/50" : ""
                                                        }`}
                                                    >
                                                        <td className="p-3 font-mono font-bold text-slate-900">
                                                            {ln.loanId}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-bold text-slate-900">{cust?.fullName || "—"}</div>
                                                            <div className="text-[10px] text-slate-500">{cust?.mobile}</div>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-slate-800">
                                                            {formatCurrency(ln.loanAmount)}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-emerald-800">
                                                            {formatCurrency(ln.netDisbursedAmount || ln.loanAmount)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                {ln.repaymentFrequency}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 text-[11px] rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black cursor-pointer shadow-xs"
                                                                onClick={() => handleSelectLoan(ln)}
                                                            >
                                                                Disburse
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

                {/* DISBURSEMENT VOUCHER PANEL */}
                <div>
                    {selectedLoan ? (
                        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        Disbursement Voucher
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                        {selectedLoan.loanId} —{" "}
                                        {typeof selectedLoan.customer === "object"
                                            ? selectedLoan.customer.fullName
                                            : ""}
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-emerald-800">Gross Sanction:</span>
                                        <span className="font-bold">{formatCurrency(selectedLoan.loanAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Deductions (Fees):</span>
                                        <span>
                                            - {formatCurrency((selectedLoan.processingFee || 0) + (selectedLoan.documentationCharges || 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-black text-sm text-emerald-900 pt-1 border-t border-emerald-200">
                                        <span>Net Payout to Customer:</span>
                                        <span>
                                            {formatCurrency(selectedLoan.netDisbursedAmount || selectedLoan.loanAmount)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Payment Mode</label>
                                        <select
                                            value={disbursementMethod}
                                            onChange={(e) =>
                                                setDisbursementMethod(e.target.value as "CASH" | "BANK_TRANSFER" | "UPI")
                                            }
                                            className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                                        >
                                            <option value="CASH">Cash (Branch Vault CashBox)</option>
                                            <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                            <option value="UPI">UPI Payment</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Voucher / Payment Number</label>
                                        <Input
                                            type="text"
                                            value={voucherNo}
                                            onChange={(e) => setVoucherNo(e.target.value)}
                                            className="rounded-xl text-xs"
                                        />
                                    </div>

                                    {disbursementMethod !== "CASH" && (
                                        <div className="space-y-1">
                                            <label className="font-semibold text-slate-700">
                                                Bank Reference / UTR Number
                                            </label>
                                            <Input
                                                type="text"
                                                value={bankReference}
                                                onChange={(e) => setBankReference(e.target.value)}
                                                placeholder="e.g. UTR1298492021"
                                                className="rounded-xl text-xs"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">First Installment Due Date</label>
                                        <Input
                                            type="date"
                                            value={firstDueDate}
                                            onChange={(e) => setFirstDueDate(e.target.value)}
                                            className="rounded-xl text-xs"
                                        />
                                    </div>
                                </div>

                                {/* DAYSHEET DEBIT NOTIFICATION */}
                                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Daysheet Accounting Notice:</strong> Disbursing in Cash will
                                        automatically record a <strong>DEBIT (Payout)</strong> entry in the Smart
                                        Savings Day Sheet.
                                    </div>
                                </div>

                                <Button
                                    onClick={handleDisburse}
                                    className="w-full bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-black rounded-xl text-xs h-11 cursor-pointer shadow-md"
                                >
                                    <Banknote className="w-4 h-4 mr-1.5" />
                                    Confirm Payout &amp; Disburse
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Select an approved loan from the table to process disbursement.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

