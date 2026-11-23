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
    Clock,
    Receipt,
    Printer,
    CheckCircle2,
    Search,
    Coins,
    Banknote,
    AlertCircle,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument, IPersonalLoanCollectionDocument } from "@/types/personal-loan";

export default function WeeklyEmiCollectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<IPersonalLoanDocument | null>(null);

    // Collection entry state
    const [collectionAmount, setCollectionAmount] = useState("");
    const [penaltyPaid, setPenaltyPaid] = useState("0");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "BANK_TRANSFER">("CASH");
    const [remarks, setRemarks] = useState("");
    const [receiptData, setReceiptData] = useState<IPersonalLoanCollectionDocument | null>(null);

    const loadLoans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=ACTIVE,OVERDUE");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            }
        } catch {
            toast.error("Failed to load active loans");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLoans();
    }, [loadLoans]);

    const handleSelectLoan = (ln: IPersonalLoanDocument) => {
        setSelectedLoan(ln);
        setCollectionAmount(String(ln.installmentAmount || 1000));
        setPenaltyPaid(String(ln.penaltyOutstanding || 0));
        setRemarks(`${ln.repaymentFrequency} EMI installment collection`);
        setReceiptData(null);
    };

    const handleCollect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        const amt = Number(collectionAmount);
        if (!amt || amt <= 0) {
            return toast.error("Please enter a valid collection amount");
        }

        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans/collections/weekly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loanId: selectedLoan._id,
                    amount: amt,
                    penaltyPaid: Number(penaltyPaid) || 0,
                    paymentMethod,
                    remarks,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Collection receipt recorded successfully! Daysheet Credited.");
                setReceiptData(data.collection);
                loadLoans();
            } else {
                toast.error(data.error || "Collection failed");
            }
        } catch {
            toast.error("Network error submitting collection");
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
                        Weekly &amp; Monthly EMI Collection Desk
                    </h1>
                    <p className="text-xs text-slate-500">
                        Record regular scheduled installments, auto-split principal vs interest, and credit Daysheet
                    </p>
                </div>
            </div>

            <LoanNav />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* BORROWER SELECTOR LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Select Running Loan Account ({loans.length})
                            </h2>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3 text-left">Loan ID</th>
                                            <th className="p-3 text-left">Borrower</th>
                                            <th className="p-3 text-center">Frequency</th>
                                            <th className="p-3 text-right">Installment Due</th>
                                            <th className="p-3 text-right">Outstanding</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No active loans with pending installments found.
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
                                                        <td className="p-3 text-center">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                {ln.repaymentFrequency}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-[#241E4E]">
                                                            {formatCurrency(ln.installmentAmount)}
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-rose-700">
                                                            {formatCurrency(ln.totalOutstanding)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 text-[11px] rounded-lg bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-bold cursor-pointer"
                                                                onClick={() => handleSelectLoan(ln)}
                                                            >
                                                                Collect
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

                {/* COLLECTION INPUT / RECEIPT PRINT CARD */}
                <div>
                    {receiptData ? (
                        <Card className="rounded-3xl border-2 border-emerald-500 shadow-md bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="text-center pb-3 border-b border-slate-100">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-2">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Collection Successful!
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono">
                                        Receipt: {receiptData.receiptNo}
                                    </p>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Collected:</span>
                                        <span className="font-black text-emerald-800 text-sm">
                                            {formatCurrency(receiptData.totalAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Principal Portion:</span>
                                        <span className="font-bold">{formatCurrency(receiptData.principalPortion)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Interest Portion:</span>
                                        <span className="font-bold">{formatCurrency(receiptData.interestPortion)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Payment Mode:</span>
                                        <span className="font-bold text-slate-800">{receiptData.paymentMethod}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        onClick={() => window.print()}
                                        className="w-full bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-bold rounded-xl text-xs h-10 cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4 mr-1.5" />
                                        Print Official Receipt
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setReceiptData(null);
                                            setSelectedLoan(null);
                                        }}
                                        className="w-full rounded-xl text-xs h-9 cursor-pointer"
                                    >
                                        Done / Next Collection
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : selectedLoan ? (
                        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        Record Payment
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                        {selectedLoan.loanId} —{" "}
                                        {typeof selectedLoan.customer === "object"
                                            ? selectedLoan.customer.fullName
                                            : ""}
                                    </div>
                                    <div className="text-xs text-rose-700 font-bold mt-0.5">
                                        Current Outstanding: {formatCurrency(selectedLoan.totalOutstanding)}
                                    </div>
                                </div>

                                <form onSubmit={handleCollect} className="space-y-3 text-xs">
                                    <div className="space-y-1">
                                        <label className="font-bold text-slate-800">
                                            Collection Amount (₹) <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            value={collectionAmount}
                                            onChange={(e) => setCollectionAmount(e.target.value)}
                                            className="h-10 rounded-xl font-black text-emerald-950 bg-emerald-50/40 border-emerald-300"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Payment Mode</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) =>
                                                setPaymentMethod(e.target.value as "CASH" | "UPI" | "BANK_TRANSFER")
                                            }
                                            className="w-full p-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                                        >
                                            <option value="CASH">Cash (Branch Vault Credit)</option>
                                            <option value="UPI">UPI</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Remarks</label>
                                        <Input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="rounded-xl text-xs"
                                        />
                                    </div>

                                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
                                        ✓ Cash collections will automatically record a <strong>CREDIT</strong> in the
                                        Smart Savings Day Sheet today.
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-[#7C5CFC] hover:bg-[#d97706] text-slate-950 font-black rounded-xl text-xs h-11 cursor-pointer shadow-md"
                                    >
                                        <Receipt className="w-4 h-4 mr-1.5" />
                                        Confirm Collection &amp; Issue Receipt
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Select a loan from the table to record weekly or monthly installment payment.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

