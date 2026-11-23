"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Customer } from "@/types/customer";
import { Calendar, Search, Users, Phone, Printer } from "lucide-react";

export default function ClientReportPage() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [clients, setClients] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isTeller) {
            const today = getTodayIST();
            setFrom(today);
            setTo(today);
        }
    }, [isTeller]);

    const generateReport = useCallback(async () => {
        const queryFrom = isTeller ? (from || getTodayIST()) : from;
        const queryTo = isTeller ? (to || getTodayIST()) : to;

        if (!queryFrom || !queryTo) return toast.warning("Select both dates");

        try {
            setLoading(true);
            const res = await fetch(`/api/clients?from=${queryFrom}&to=${queryTo}`);
            const data = await res.json();
            if (data.success) {
                setClients(data.clients || []);
                if ((data.clients || []).length === 0) {
                    toast.info("No customers found for the specified period.");
                }
            } else {
                toast.error(data.error || "Failed to load report data.");
            }
        } catch {
            toast.error("An error occurred while fetching the report.");
        } finally {
            setLoading(false);
        }
    }, [from, to, isTeller]);

    useEffect(() => {
        if (isTeller && from && to) {
            void generateReport();
        }
    }, [isTeller, from, to, generateReport]);

    const handlePrint = () => {
        if (clients.length === 0) {
            toast.warning("No records to print. Generate a report first.");
            return;
        }
        window.print();
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:max-w-none print:m-0">
            {/* Breadcrumb Header (Hidden on Print) */}
            <div className="print:hidden">
                <PageHeader />
            </div>

            {/* Official Print-Only Letterhead Header */}
            <div className="hidden print:flex items-center justify-between gap-4 border-b-2 border-slate-900/80 pb-4 mb-6">
                {/* Left: Company Logo */}
                <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 shrink-0">
                        <Image
                            src="/default/logo.png"
                            alt="Company Logo"
                            fill
                            sizes="80px"
                            priority
                            className="object-contain"
                        />
                    </div>
                </div>

                {/* Right: Company Name & Address */}
                <div className="text-right space-y-0.5 max-w-md">
                    <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                        SAMPLE PRIME SMALL FINANCE PVT LTD
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        No. 112, PALAVATHANKATTALAI<br />
                        KARAIKAL MAIN ROAD KUMBAKONAM,<br />
                        THANJAVUR DISTRICT, PINCODE: 612401.
                    </p>
                </div>
            </div>

            {/* Title & Screen Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5 print:text-black">
                        <Users className="w-6 h-6 text-amber-500 print:hidden" />
                        New Customer Report
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        {from && to ? (
                            <span>
                                Showing records from <strong className="text-slate-800">{from}</strong> to{" "}
                                <strong className="text-slate-800">{to}</strong> (Total: {clients.length})
                            </span>
                        ) : (
                            "Filter and view newly onboarded customers by date range."
                        )}
                    </p>
                </div>

                {/* Print Button (Hidden in Print Dialog) */}
                {clients.length > 0 && (
                    <Button
                        onClick={handlePrint}
                        className="print:hidden bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs hover:shadow-amber-500/10 rounded-xl h-10 px-5 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
                    >
                        <Printer className="w-4 h-4 text-amber-400" />
                        Print Report
                    </Button>
                )}
            </div>

            {/* Filter Bar (Hidden on Print) */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/90 shadow-xs backdrop-blur-md print:hidden">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5">
                        {isTeller ? (
                            <div className="flex-1 flex items-center p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-slate-700 text-sm font-medium">
                                Report date: Today (IST)
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1.5 flex-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                        From Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>

                                <div className="space-y-1.5 flex-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                        To Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                            </>
                        )}

                        <Button
                            onClick={generateReport}
                            disabled={loading}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs hover:shadow-amber-500/10 transition-all rounded-xl h-10 px-6 flex items-center gap-2 cursor-pointer"
                        >
                            <Search className="w-4 h-4 text-amber-400" />
                            {loading ? "Generating..." : "Generate"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Printable Report Table */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 shadow-md overflow-hidden print:border print:border-slate-300 print:shadow-none print:rounded-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse print:text-[11px]">
                        <thead>
                            <tr className="bg-slate-900 text-white border-b border-amber-500/30 print:bg-slate-100 print:text-slate-900 print:border-b-2 print:border-slate-400">
                                <th className="py-3.5 px-4 font-bold text-amber-400 print:text-slate-900 tracking-wider w-14 text-center">
                                    S.No
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Customer Details
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Center Name
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Joining Date
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Nominee Info
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Created By
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Collection Staff
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                            {clients.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-12 text-center text-slate-400 font-medium print:py-6"
                                    >
                                        No customer records found for the selected dates.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client: Customer, index: number) => (
                                    <tr
                                        key={client._id || index}
                                        className="hover:bg-amber-50/40 transition-colors print:hover:bg-transparent"
                                    >
                                        <td className="py-3 px-4 text-center font-bold text-slate-700 bg-slate-50/50 print:bg-transparent">
                                            {index + 1}
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-slate-900 text-sm print:text-xs">
                                                    {client.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 print:text-[10px]">
                                                    <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 print:border-none print:p-0">
                                                        {client.customerCode || "-"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-slate-400 print:hidden" />
                                                        {client.phone || "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 font-semibold text-slate-800">
                                            {client.group?.groupName || "-"}
                                        </td>

                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                            {client.createdAt
                                                ? new Date(client.createdAt).toLocaleDateString()
                                                : "-"}
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className="space-y-0.5">
                                                <p className="font-semibold text-slate-800">
                                                    {client.nominee?.name || "-"}
                                                </p>
                                                <p className="text-[11px] text-slate-500 print:text-[10px]">
                                                    {client.nominee?.relation && (
                                                        <span className="capitalize">{client.nominee.relation} • </span>
                                                    )}
                                                    {client.nominee?.phone || "-"}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 text-slate-700 font-medium">
                                            {client.group?.createdBy?.name || "-"}
                                        </td>

                                        <td className="py-3 px-4 text-slate-700 font-medium">
                                            {client.group?.employee?.name || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}