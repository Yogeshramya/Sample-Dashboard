"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    UserCheck,
    Phone,
    MapPin,
    Briefcase,
    CreditCard,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Search,
    Eye,
    ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalClient } from "@/types/personal";

export default function PersonalCustomerApprovalPage() {
    const router = useRouter();
    const [clients, setClients] = useState<PersonalClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const loadClients = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch("/api/personal/clients?status=PENDING");
            const data = await res.json();
            if (data.success) {
                setClients(data.clients || []);
            } else {
                toast.error(data.error || "Failed to load pending customers");
            }
        } catch {
            toast.error("Error loading pending customers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClients(true);
    }, [loadClients]);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/personal/clients/${id}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: action === "reject" ? "Rejected by administrator" : "" }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Customer ${action === "approve" ? "Approved" : "Rejected"} successfully`);
                setClients((prev) => prev.filter((c) => c._id !== id));
            } else {
                toast.error(data.error || `Failed to ${action} customer`);
            }
        } catch {
            toast.error("Network error during action");
        } finally {
            setActionId(null);
        }
    };

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.fullName.toLowerCase().includes(q) ||
            c.clientId.toLowerCase().includes(q) ||
            c.mobile.includes(q) ||
            c.panNumber?.toLowerCase().includes(q)
        );
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <UserCheck className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        KYC &amp; Registration Approval
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pending Customer Approvals
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm">
                        Verify customer KYC documents, address, and guarantor details before activating smart savings accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => loadClients(true)}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <button
                        onClick={() => router.push("/dashboard/personal/approval")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Approvals
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Client ID (YPC-...), Customer Name, Mobile, PAN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl text-xs"
                    />
                </div>
                <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    Showing <span className="text-slate-900 font-black">{filtered.length}</span> Pending Customers
                </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map((c) => (
                    <Card
                        key={c._id}
                        className="bg-white border-slate-200 hover:border-amber-400 rounded-3xl shadow-xs hover:shadow-lg transition-all overflow-hidden"
                    >
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#7C5CFC] bg-[#241E4E] px-2.5 py-0.5 rounded border border-[#7C5CFC]/30">
                                            {c.clientId}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                            Pending Approval
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mt-1">{c.fullName}</h3>
                                </div>
                                <div className="text-right text-[11px] text-slate-400">
                                    <p>{new Date(c.createdAt).toLocaleDateString()}</p>
                                    <p className="font-bold text-slate-600">
                                        {typeof c.branchId === "object" ? c.branchId?.name : "Branch"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" /> Contact
                                    </span>
                                    <p className="font-bold text-slate-900">{c.mobile}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                                        <Briefcase className="w-3 h-3 text-slate-400" /> Occupation &amp; Income
                                    </span>
                                    <p className="font-bold text-slate-900">
                                        {c.occupation} • ₹ {c.monthlyIncome?.toLocaleString() || "10,000"}/mo
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Address
                                </span>
                                <p className="text-slate-700 leading-snug">{c.address}</p>
                            </div>

                            {/* KYC Documents Preview */}
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-600 text-[11px] flex items-center gap-1.5">
                                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                        KYC Proofs: {c.idProofType} ({c.idProofNumber})
                                    </span>
                                    {c.panNumber && c.panNumber !== "NOTPROVIDED" && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            PAN: {c.panNumber}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {c.idProofFrontUrl && (
                                        <a
                                            href={c.idProofFrontUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-amber-600"
                                        >
                                            <Eye className="w-3 h-3" /> ID Front
                                        </a>
                                    )}
                                    {c.idProofBackUrl && (
                                        <a
                                            href={c.idProofBackUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-amber-600"
                                        >
                                            <Eye className="w-3 h-3" /> ID Back
                                        </a>
                                    )}
                                    {c.panPhotoUrl && (
                                        <a
                                            href={c.panPhotoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-amber-600"
                                        >
                                            <Eye className="w-3 h-3" /> PAN Card
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Nominee details */}
                            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-1">
                                <p className="text-[10px] font-bold uppercase text-amber-900 tracking-wider">
                                    Nominee / Beneficiary Details
                                </p>
                                <p className="font-bold text-slate-900">
                                    {c.guarantorName} ({c.guarantorRelation}) • {c.guarantorMobile}
                                </p>
                                {c.guarantorAadhaar && (
                                    <p className="text-[11px] text-slate-500">
                                        Nominee Aadhaar: {c.guarantorAadhaar}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex items-center gap-3">
                                <Button
                                    disabled={actionId === c._id}
                                    onClick={() => handleAction(c._id, "approve")}
                                    className="flex-1 bg-[#241E4E] hover:bg-[#2F2864] text-amber-300 font-bold rounded-xl py-2 h-10 cursor-pointer shadow-xs"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                                    Approve Customer
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={actionId === c._id}
                                    onClick={() => handleAction(c._id, "reject")}
                                    className="rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold py-2 h-10 px-4 cursor-pointer"
                                >
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!loading && filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                        <h3 className="font-bold text-lg text-slate-900">All Customers Approved</h3>
                        <p className="text-slate-500 text-xs max-w-md mx-auto">
                            There are currently no new savings customers pending approval. Newly registered customers will appear here for verification.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

