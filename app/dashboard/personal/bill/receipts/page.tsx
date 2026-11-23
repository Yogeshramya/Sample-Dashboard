"use client";

import { useState, useEffect } from "react";
import { Receipt, Printer, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalDeposit } from "@/types/personal";

export default function SavingsReceiptsPage() {
    const [deposits, setDeposits] = useState<PersonalDeposit[]>([]);
    const [selectedDeposit, setSelectedDeposit] = useState<PersonalDeposit | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadDeposits() {
            try {
                const res = await fetch("/api/personal/deposits");
                const data = await res.json();
                if (isMounted && data.success) {
                    setDeposits(data.deposits || []);
                    if (data.deposits?.length > 0) {
                        setSelectedDeposit(data.deposits[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load receipts:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadDeposits();
        return () => {
            isMounted = false;
        };
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const filtered = deposits.filter((d) => {
        const q = search.toLowerCase();
        return (
            d.receiptNo?.toLowerCase().includes(q) ||
            d.account?.accountNumber?.toLowerCase().includes(q) ||
            d.customer?.fullName?.toLowerCase().includes(q) ||
            d.customer?.mobile?.includes(q)
        );
    });

    return (
        <section className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <div className="print:hidden">
                <PageHeader />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Receipt className="w-8 h-8 text-amber-500" />
                        Deposit Receipts & Passbook Slips
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Select a transaction receipt below to view, verify, or print official slips.
                    </p>
                </div>

                {selectedDeposit && (
                    <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Official Receipt
                    </Button>
                )}
            </div>

            {/* Selector Grid */}
            <div className="print:hidden bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search receipt by number, customer name, account..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>

                <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {filtered.slice(0, 10).map((d) => (
                        <button
                            key={d._id}
                            onClick={() => setSelectedDeposit(d)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                selectedDeposit?._id === d._id
                                    ? "bg-slate-900 text-amber-400 font-bold shadow-xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            <span className="font-mono block text-[10px] opacity-75">{d.receiptNo}</span>
                            <span className="font-bold">{d.customer?.fullName}</span>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="text-[10px] text-amber-600 font-mono">
                                    ₹{d.amount?.toLocaleString()}
                                </span>
                                <span
                                    className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded ${
                                        d.status === "APPROVED" || !d.status
                                            ? "bg-emerald-200 text-emerald-900"
                                            : d.status === "PENDING"
                                            ? "bg-amber-200 text-amber-900"
                                            : "bg-rose-200 text-rose-900"
                                    }`}
                                >
                                    {d.status === "APPROVED" || !d.status ? "Approved" : d.status === "PENDING" ? "Pending" : "Rejected"}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Printable Receipt Paper */}
            {selectedDeposit ? (
                <div className="bg-white border-2 border-slate-300 rounded-3xl p-8 md:p-12 shadow-xl text-slate-800 space-y-6 max-w-2xl mx-auto print:border-none print:shadow-none print:p-0">
                    {/* Header */}
                    <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-5">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                            Sample Small Finance Pvt Ltd
                        </h2>
                        <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">
                            Smart Savings Plan Deposit Receipt
                        </p>
                        <p className="text-[11px] text-slate-500">
                            12 Months Contribution + 2 Months Guaranteed Benefit
                        </p>
                    </div>

                    {/* Receipt Meta */}
                    <div className="grid grid-cols-2 text-xs gap-4 pt-1 border-b pb-4">
                        <div>
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Receipt Number</p>
                            <p className="font-mono font-black text-base text-slate-900">{selectedDeposit.receiptNo}</p>
                            <span
                                className={`inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                    selectedDeposit.status === "APPROVED" || !selectedDeposit.status
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : selectedDeposit.status === "PENDING"
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}
                            >
                                {selectedDeposit.status === "APPROVED" || !selectedDeposit.status
                                    ? "Approved"
                                    : selectedDeposit.status === "PENDING"
                                    ? "Awaiting Admin Approval"
                                    : "Rejected"}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Deposit Date</p>
                            <p className="font-bold text-slate-900">
                                {new Date(selectedDeposit.depositDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Customer Name:</span>
                            <span className="font-bold text-slate-900 text-sm">{selectedDeposit.customer?.fullName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Customer Code:</span>
                            <span className="font-mono font-bold text-slate-700">{selectedDeposit.customer?.clientId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Savings Account No:</span>
                            <span className="font-mono font-bold text-amber-700">{selectedDeposit.account?.accountNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Plan Frequency:</span>
                            <span className="font-bold uppercase text-slate-800">{selectedDeposit.account?.frequency}</span>
                        </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-amber-900 font-medium">Cycles Paid in this Entry:</span>
                            <span className="font-black text-slate-900">{selectedDeposit.installmentCount} Installment(s)</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-amber-900 font-medium">Payment Mode:</span>
                            <span className="font-bold uppercase text-slate-900">{selectedDeposit.paymentMethod}</span>
                        </div>
                        <div className="pt-2 border-t border-amber-300 flex justify-between items-center text-base">
                            <span className="font-black text-slate-900">Total Amount Received:</span>
                            <span className="font-black text-amber-700 text-xl">
                                ₹ {selectedDeposit.amount?.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="pt-12 grid grid-cols-2 text-center text-xs">
                        <div className="space-y-1">
                            <div className="w-32 border-t border-slate-400 mx-auto" />
                            <p className="font-bold text-slate-800">Customer Signature</p>
                        </div>
                        <div className="space-y-1">
                            <div className="w-32 border-t border-slate-400 mx-auto" />
                            <p className="font-bold text-slate-800">Authorized Collector</p>
                            <p className="text-[10px] text-slate-400">{selectedDeposit.collectedBy?.name || "Officer"}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-24 text-center text-slate-400 font-medium">
                    No deposit receipts available to display.
                </div>
            )}
        </section>
    );
}

