"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Save, CheckCircle2, Coins, Printer } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalAccount, PersonalDeposit, PaymentMethod } from "@/types/personal";

function CollectDepositForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefillAccountId = searchParams.get("accountId");

    const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<PersonalAccount | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const [installmentCount, setInstallmentCount] = useState<number>(1);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [depositDate, setDepositDate] = useState(new Date().toISOString().split("T")[0]);
    const [remarks, setRemarks] = useState("");

    const [lastReceipt, setLastReceipt] = useState<PersonalDeposit | null>(null);

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const res = await fetch("/api/personal/accounts?status=ACTIVE");
                const data = await res.json();
                if (data.success) {
                    setAccounts(data.accounts || []);
                    if (prefillAccountId) {
                        const found = (data.accounts || []).find((a: PersonalAccount) => a._id === prefillAccountId);
                        if (found) setSelectedAccount(found);
                    }
                }
            } catch (err) {
                console.error("Failed to load accounts:", err);
            }
        }
        fetchAccounts();
    }, [prefillAccountId]);

    const handleSelectAccount = (acc: PersonalAccount) => {
        setSelectedAccount(acc);
        setInstallmentCount(1);
    };

    const calculatedAmount = selectedAccount
        ? (selectedAccount.installmentAmount || 0) * (installmentCount || 1)
        : 0;

    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount) return toast.error("Please select an active savings account");
        if (installmentCount <= 0) return toast.error("Installment count must be at least 1");

        setLoading(true);
        try {
            const res = await fetch("/api/personal/deposits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: selectedAccount._id,
                    installmentCount,
                    amount: calculatedAmount,
                    paymentMethod,
                    depositDate,
                    remarks,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Deposit submitted and sent for Administrator Approval!");
                setLastReceipt(data.deposit);
            } else {
                toast.error(data.message || "Failed to record deposit");
            }
        } catch {
            toast.error("Network error while recording deposit");
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.accountNumber?.toLowerCase().includes(q) ||
            a.customer?.fullName?.toLowerCase().includes(q) ||
            a.customer?.mobile?.includes(q)
        );
    });

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Coins className="w-8 h-8 text-amber-500" />
                    Record Savings Deposit
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                    Collect daily, weekly, or monthly installments and update customer savings passbooks.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Account Search & Select */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 md:col-span-1 shadow-xs max-h-[620px] overflow-y-auto">
                    <p className="text-xs font-bold text-slate-500 uppercase">Select Active Account</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Account #, Name, Mobile..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        {filteredAccounts.map((a) => (
                            <button
                                key={a._id}
                                type="button"
                                onClick={() => handleSelectAccount(a)}
                                className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    selectedAccount?._id === a._id
                                        ? "bg-slate-900 text-amber-400 font-bold shadow-xs"
                                        : "hover:bg-slate-100 text-slate-700"
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-mono">{a.accountNumber}</span>
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                        {a.frequency}
                                    </span>
                                </div>
                                <p className="text-sm font-bold truncate mt-1">{a.customer?.fullName}</p>
                                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                                    <span>₹{a.installmentAmount?.toLocaleString()} / cycle</span>
                                    <span>{a.paidInstallments} / {a.totalTargetInstallments} paid</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Deposit Entry Form */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 md:col-span-2 shadow-xs">
                    {selectedAccount ? (
                        <form onSubmit={handleDepositSubmit} className="space-y-6">
                            {/* Account Snapshot Header */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {selectedAccount.accountNumber}
                                    </span>
                                    <h3 className="text-lg font-black text-slate-900 mt-1">
                                        {selectedAccount.customer?.fullName}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Mobile: {selectedAccount.customer?.mobile} • Plan: {selectedAccount.scheme?.schemeName}
                                    </p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Total Saved So Far</p>
                                    <p className="text-xl font-black text-amber-600">
                                        ₹ {selectedAccount.totalDeposited?.toLocaleString()}
                                    </p>
                                    <p className="text-xs font-semibold text-slate-500">
                                        {selectedAccount.paidInstallments} of {selectedAccount.totalTargetInstallments} cycles paid
                                    </p>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">
                                        Installments Count to Collect *
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={selectedAccount.totalTargetInstallments - selectedAccount.paidInstallments || 360}
                                        value={installmentCount}
                                        onChange={(e) => setInstallmentCount(Number(e.target.value))}
                                        required
                                        className="rounded-xl font-black text-base"
                                    />
                                    <p className="text-[11px] text-slate-400">
                                        e.g. 1 for today, or 7 for full week collection
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Deposit Date *</label>
                                    <Input
                                        type="date"
                                        value={depositDate}
                                        onChange={(e) => setDepositDate(e.target.value)}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                        className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="BANK_TRANSFER">BANK TRANSFER / NEFT</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Collection Remarks</label>
                                    <Input
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Optional transaction notes..."
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Payment Summary Box */}
                            <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Collection Amount</p>
                                    <p className="text-3xl font-black text-slate-900 mt-0.5">
                                        ₹ {calculatedAmount.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {installmentCount} installment(s) × ₹{selectedAccount.installmentAmount?.toLocaleString()}
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || calculatedAmount <= 0}
                                    className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl px-6 py-5 cursor-pointer text-sm"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Submit for Approval
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="py-24 text-center text-slate-400 font-medium">
                            Select a customer account from the left panel to record a deposit.
                        </div>
                    )}

                    {/* Receipt Notification Banner */}
                    {lastReceipt && (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl">⏳</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold uppercase">Submitted for Approval</p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                                            PENDING APPROVAL
                                        </span>
                                    </div>
                                    <p className="text-sm font-black">
                                        Receipt #{lastReceipt.receiptNo} • ₹{lastReceipt.amount?.toLocaleString()} ({lastReceipt.paymentMethod})
                                    </p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        This deposit will officially credit the account balance upon Administrator approval.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push("/dashboard/personal/bill/history")}
                                className="border-amber-600 text-amber-900 hover:bg-amber-100 font-bold text-xs"
                            >
                                View History
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function CollectDepositPage() {
    return (
        <Suspense fallback={<LoadingOverlay show={true} />}>
            <CollectDepositForm />
        </Suspense>
    );
}

