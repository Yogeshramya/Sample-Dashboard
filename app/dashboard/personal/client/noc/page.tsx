"use client";

import { useState, useEffect } from "react";
import { FileText, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { PersonalClient } from "@/types/personal";

export default function CustomerNocPage() {
    const [clients, setClients] = useState<PersonalClient[]>([]);
    const [selectedClient, setSelectedClient] = useState<PersonalClient | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;
        async function fetchClients() {
            try {
                const res = await fetch("/api/personal/clients");
                const data = await res.json();
                if (isMounted && data.success) {
                    setClients(data.clients || []);
                }
            } catch (err) {
                console.error("Failed to load clients for NOC:", err);
            }
        }
        fetchClients();
        return () => {
            isMounted = false;
        };
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const filtered = clients.filter(
        (c) =>
            c.fullName.toLowerCase().includes(search.toLowerCase()) ||
            c.clientId.toLowerCase().includes(search.toLowerCase()) ||
            c.mobile.includes(search)
    );

    return (
        <section className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
            <div className="print:hidden">
                <PageHeader />
            </div>

            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-amber-500" />
                        Customer Clearance & NOC
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Generate and print official No Objection Certificates for completed savings accounts.
                    </p>
                </div>

                {selectedClient && (
                    <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Certificate
                    </Button>
                )}
            </div>

            {/* Selector */}
            <div className="print:hidden space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search customer to issue certificate..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 text-xs"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filtered.slice(0, 8).map((c) => (
                        <button
                            key={c._id}
                            onClick={() => setSelectedClient(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                selectedClient?._id === c._id
                                    ? "bg-slate-900 text-amber-400"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            {c.fullName} ({c.clientId})
                        </button>
                    ))}
                </div>
            </div>

            {/* Printable Certificate */}
            {selectedClient ? (
                <div className="bg-white border-2 border-amber-600/30 rounded-3xl p-8 md:p-14 shadow-lg text-slate-800 space-y-8 print:border-none print:shadow-none print:p-0">
                    <div className="text-center space-y-2 border-b-2 border-amber-600/20 pb-6">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                            Sample Small Finance Pvt Ltd
                        </h2>
                        <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">
                            Smart Savings & Personal Finance Division
                        </p>
                        <p className="text-xs text-slate-500">
                            Registered Office: Tamil Nadu, India • Email: support@example.com
                        </p>
                    </div>

                    <div className="text-center my-6">
                        <span className="inline-block px-6 py-1.5 rounded-full bg-amber-100 text-amber-900 font-bold text-sm tracking-widest uppercase border border-amber-300">
                            No Objection & Clearance Certificate
                        </span>
                        <p className="text-xs text-slate-400 mt-2">
                            Ref Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                    </div>

                    <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                        <p>To Whomsoever It May Concern,</p>
                        <p>
                            This is to certify that <strong>{selectedClient.fullName}</strong> (Client ID:{" "}
                            <span className="font-mono font-bold">{selectedClient.clientId}</span>), residing at{" "}
                            <em>{selectedClient.address}</em>, holding PAN{" "}
                            <span className="font-mono font-bold">{selectedClient.panNumber}</span>, has successfully completed all necessary obligations and savings commitments under the <strong>Smart Savings Plan</strong> with our institution.
                        </p>
                        <p>
                            As of today, there are no outstanding liabilities, dues, or encumbrances pending against the above-mentioned customer in our records.
                        </p>
                        <p>
                            Sample Small Finance Pvt Ltd issues this No Objection Certificate upon customer request with full clearance of records.
                        </p>
                    </div>

                    <div className="pt-16 grid grid-cols-2 text-center text-xs">
                        <div className="space-y-1">
                            <div className="w-36 border-t border-slate-400 mx-auto" />
                            <p className="font-bold text-slate-800">Branch Manager / Officer</p>
                            <p className="text-slate-500">Authorized Signatory</p>
                        </div>
                        <div className="space-y-1">
                            <div className="w-36 border-t border-slate-400 mx-auto" />
                            <p className="font-bold text-slate-800">Branch Seal</p>
                            <p className="text-slate-500">Sample Small Finance</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-24 text-center text-slate-400 font-medium">
                    Search and select a customer above to generate their Clearance Certificate.
                </div>
            )}
        </section>
    );
}

