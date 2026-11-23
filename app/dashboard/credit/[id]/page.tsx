"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Credit } from "@/types/credit";
import Image from "next/image";

export default function ViewCreditPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [credit, setCredit] = useState<Credit | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCredit() {
            try {
                const res = await fetch(`/api/credit/${id}`);
                const data = await res.json();

                if (!res.ok || !data.success) {
                    toast.error(data.error || "Failed to load credit");
                    return;
                }

                setCredit(data.credit);
            } catch (err) {
                console.error(err);
                toast.error("Something went wrong");
            } finally {
                setLoading(false);
            }
        }

        loadCredit();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <p className="text-amber-500 font-medium animate-pulse">Loading Credit Entry...</p>
            </div>
        );
    }

    if (!credit) {
        return (
            <div className="p-6 text-center text-slate-500">
                <p>Credit not found</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <section className="max-w-4xl mx-auto p-6 space-y-6 print:max-w-full print:p-0 print:space-y-4">
            <div className="print:hidden">
                <PageHeader />
            </div>

            {/* TITLE & ACTION BAR (HIDDEN IN PRINT) */}
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold text-slate-900">
                    View Credit Voucher
                </h1>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Back
                    </Button>
                    <Button
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                        onClick={() => window.print()}
                    >
                        Print Voucher
                    </Button>
                </div>
            </div>

            {/* CREDIT VOUCHER CARD */}
            <Card className="p-8 space-y-6 bg-white border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-4">
                {/* ================= HEADER: LOGO (LEFT) & ADDRESS (RIGHT) ================= */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <Image
                            src="/default/logo.png"
                            alt="Company Logo"
                            className="h-14 w-auto object-contain"
                            width={120}
                            height={56}
                        />
                    </div>

                    {/* Right: Company Address */}
                    <div className="text-right max-w-sm">
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                            SAMPLE PRIME SMALL FINANCE PVT LTD
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                            No. 112, PALAVATHANKATTALAI<br />
                            KARAIKAL MAIN ROAD KUMBAKONAM,<br />
                            THANJAVUR DISTRICT, PINCODE: 612401.
                        </p>
                    </div>
                </div>

                {/* VOUCHER SUB-HEADER */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100 print:bg-transparent print:p-0 print:border-none">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-wide">
                            CREDIT VOUCHER
                        </h3>
                        <p className="text-xs text-slate-500">
                            Voucher ID: {credit._id}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${credit.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}>
                            {credit.status}
                        </span>
                    </div>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm border-t border-b border-slate-100 py-4">
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Branch</p>
                        <p className="font-semibold text-slate-800">{credit.branch?.name || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Date</p>
                        <p className="font-semibold text-slate-800">
                            {credit.date ? new Date(credit.date).toLocaleDateString() : "N/A"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Payment Mode</p>
                        <p className="font-semibold text-slate-800">{credit.mode || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Credit Type / Title</p>
                        <p className="font-semibold text-slate-800">{credit.title}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Amount</p>
                        <p className="text-lg font-bold text-amber-600">
                            ₹ {Number(credit.amount).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Transaction Type</p>
                        <p className="font-semibold text-slate-800">Credit</p>
                    </div>
                </div>

                {/* DETAILS / NOTES */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Remarks / Details
                    </p>
                    <div className="border border-slate-200 rounded-md p-3 mt-1.5 text-sm text-slate-700 bg-slate-50/50 print:bg-transparent print:border print:border-slate-300 min-h-15">
                        {credit.details || "No additional remarks provided."}
                    </div>
                </div>

                {/* SIGNATURE AREA (PRINT & VOUCHER COPY) */}
                <div className="flex justify-between pt-16 text-sm">
                    <div className="text-center">
                        <div className="border-t border-slate-400 w-48 pt-1 text-slate-700 font-medium">
                            {credit.employee?.name || "Prepared By"}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Prepared By</p>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-slate-400 w-48 pt-1 text-slate-700 font-medium">
                            Authorized Signature
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Verified & Approved</p>
                    </div>
                </div>

                {/* BOTTOM ACTION BUTTONS (HIDDEN IN PRINT) */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
                    <Button
                        variant="secondary"
                        onClick={() => router.back()}
                    >
                        Back
                    </Button>
                    <Button
                        className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-sm"
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </div>
            </Card>
        </section>
    );
}
