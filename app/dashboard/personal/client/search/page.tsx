"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Users,
    Phone,
    MapPin,
    Calendar,
    PlusCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { PersonalClient } from "@/types/personal";

export default function SearchPersonalClientPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [clients, setClients] = useState<PersonalClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<PersonalClient | null>(null);

    const fetchClients = async (searchTerm = "") => {
        setLoading(true);
        try {
            const url = searchTerm
                ? `/api/personal/clients?search=${encodeURIComponent(searchTerm)}`
                : "/api/personal/clients";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setClients(data.clients || []);
            }
        } catch (error) {
            console.error("Failed to load clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        async function loadInitial() {
            try {
                const res = await fetch("/api/personal/clients");
                const data = await res.json();
                if (isMounted && data.success) {
                    setClients(data.clients || []);
                }
            } catch (error) {
                console.error("Failed to load clients:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadInitial();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchClients(search);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-[#7C5CFC] border border-[#7C5CFC]/30 shadow-md">
                            <Users className="w-6 h-6 text-[#7C5CFC]" />
                        </div>
                        Search Savings Customers
                    </h1>
                    <p className="text-slate-600 text-sm font-medium mt-1">
                        Find customers by client ID, name, mobile number, or PAN.
                    </p>
                </div>

                <Button
                    onClick={() => router.push("/dashboard/personal/client/new")}
                    className="bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold rounded-xl shadow-xs cursor-pointer"
                >
                    <PlusCircle className="w-4 h-4 mr-2 text-[#7C5CFC]" />
                    New Customer
                </Button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search by Client Code (YPSS-...), Name, Mobile, or PAN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 bg-white rounded-xl border-slate-300 focus-visible:ring-[#7C5CFC]"
                    />
                </div>
                <Button type="submit" disabled={loading} className="h-11 bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold px-6 rounded-xl cursor-pointer shadow-xs">
                    {loading ? "Searching..." : "Search"}
                </Button>
            </form>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((c) => (
                    <Card
                        key={c._id}
                        className="bg-white border-slate-200/90 hover:border-[#7C5CFC] shadow-xs hover:shadow-xl hover:shadow-[#7C5CFC]/10 transition-all rounded-3xl overflow-hidden cursor-pointer"
                        onClick={() => setSelectedClient(c)}
                    >
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-xs font-mono font-bold text-[#7C5CFC] bg-[#241E4E] px-2.5 py-0.5 rounded-md border border-[#7C5CFC]/30">
                                        {c.clientId}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-1">{c.fullName}</h3>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                    c.status === "Active Saver"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60"
                                        : "bg-slate-100 text-slate-600"
                                }`}>
                                    {c.status}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                <p className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {c.mobile}
                                </p>
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="truncate">{c.address}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Joined {new Date(c.createdAt).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-semibold text-slate-500 font-mono">PAN: {c.panNumber || "-"}</span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-bold rounded-xl border border-[#7C5CFC]/40 text-[#241E4E] hover:bg-emerald-50 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/dashboard/personal/fund/new?customerId=${c._id}`);
                                    }}
                                >
                                    Open Plan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!loading && clients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                        No customers found matching your query.
                    </div>
                )}
            </div>

            {/* Client Detail Modal */}
            {selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-start border-b pb-4">
                            <div>
                                <span className="text-xs font-mono font-bold text-[#7C5CFC] bg-[#241E4E] px-2.5 py-0.5 rounded-md border border-[#7C5CFC]/30">
                                    {selectedClient.clientId}
                                </span>
                                <h2 className="text-xl font-black text-slate-900 mt-1">{selectedClient.fullName}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="text-slate-500 font-bold uppercase">Mobile</p>
                                <p className="font-semibold text-slate-900 text-sm mt-0.5">{selectedClient.mobile}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 font-bold uppercase">Occupation</p>
                                <p className="font-semibold text-slate-900 text-sm mt-0.5">{selectedClient.occupation || "-"}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 font-bold uppercase">PAN Number</p>
                                <p className="font-semibold text-slate-900 text-sm mt-0.5 font-mono">{selectedClient.panNumber}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 font-bold uppercase">Status</p>
                                <p className="font-semibold text-slate-900 text-sm mt-0.5">{selectedClient.status}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-slate-500 font-bold uppercase">Full Address</p>
                                <p className="font-semibold text-slate-900 mt-0.5">{selectedClient.address}</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t">
                                <p className="text-slate-500 font-bold uppercase">Nominee / Guarantor</p>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                    {selectedClient.guarantorName || "-"} ({selectedClient.guarantorRelation || "-"}) - {selectedClient.guarantorMobile || "-"}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedClient(null)}
                                className="rounded-xl font-bold cursor-pointer"
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => router.push(`/dashboard/personal/fund/new?customerId=${selectedClient._id}`)}
                                className="bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold rounded-xl cursor-pointer shadow-xs"
                            >
                                Open Savings Plan
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
