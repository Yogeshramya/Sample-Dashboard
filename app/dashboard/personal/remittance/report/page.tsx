"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, RefreshCw, ArrowRightLeft, Layers, ShieldCheck, Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Remittance {
    _id: string;
    date: string;
    fromBranch: { _id: string; name?: string; branchName?: string; code?: string };
    toBranch: { _id: string; name?: string; branchName?: string; code?: string };
    fromModule?: "MFI" | "PERSONAL";
    toModule?: "MFI" | "PERSONAL";
    remittanceType?: "INTER_BRANCH" | "INTER_MODULE";
    amount: number;
    mode: string;
    details: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestedBy?: { name?: string };
    approvedBy?: { name?: string };
}

interface Branch {
    _id: string;
    branchName?: string;
    name?: string;
}

export default function PersonalRemittanceReportPage() {
    const router = useRouter();
    const [remittances, setRemittances] = useState<Remittance[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedType, setSelectedType] = useState("ALL");
    const [loading, setLoading] = useState(false);

    // Load branches
    useEffect(() => {
        fetch("/api/branches/list")
            .then((r) => r.json())
            .then((data) => {
                setBranches(Array.isArray(data) ? data : data.branches || []);
            })
            .catch(() => toast.error("Failed to load branches"));
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedBranch !== "ALL") params.append("branchId", selectedBranch);
            if (selectedStatus !== "ALL") params.append("status", selectedStatus);
            if (selectedType !== "ALL") params.append("type", selectedType);

            const queryString = params.toString();
            const res = await fetch(`/api/personal/remittance${queryString ? `?${queryString}` : ""}`);
            const data = await res.json();
            if (data.success) {
                setRemittances(data.remittances || []);
            } else {
                toast.error(data.error || "Failed to fetch remittance report");
            }
        } catch {
            toast.error("Error fetching remittance report");
        } finally {
            setLoading(false);
        }
    }, [selectedBranch, selectedStatus, selectedType]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const stats = useMemo(() => {
        const totalCount = remittances.length;
        let approvedAmt = 0;
        let pendingAmt = 0;
        let rejectedAmt = 0;

        remittances.forEach((r) => {
            if (r.status === "APPROVED") approvedAmt += Number(r.amount || 0);
            else if (r.status === "PENDING") pendingAmt += Number(r.amount || 0);
            else if (r.status === "REJECTED") rejectedAmt += Number(r.amount || 0);
        });

        return { totalCount, approvedAmt, pendingAmt, rejectedAmt };
    }, [remittances]);

    const exportCSV = () => {
        if (!remittances.length) {
            toast.error("No data to export");
            return;
        }

        const headers = ["Date", "Type", "From Branch", "From Module", "To Branch", "To Module", "Amount", "Mode", "Details", "Status", "Requested By"];
        const rows = remittances.map((r) => [
            new Date(r.date).toLocaleDateString(),
            r.remittanceType || "INTER_BRANCH",
            `"${r.fromBranch?.name || r.fromBranch?.branchName || ""}"`,
            r.fromModule || "MFI",
            `"${r.toBranch?.name || r.toBranch?.branchName || ""}"`,
            r.toModule || "PERSONAL",
            r.amount,
            r.mode,
            `"${(r.details || "").replace(/"/g, '""')}"`,
            r.status,
            `"${r.requestedBy?.name || ""}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `personal_remittances_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Smart Savings Remittance Ledger
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm">
                        Complete historical registry of inter-branch and inter-module capital transfers.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={exportCSV}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/personal/remittance")}
                        className="rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-slate-200 shadow-xs rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Transfers</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</p>
                </Card>
                <Card className="p-4 bg-white border-emerald-200 shadow-xs rounded-2xl">
                    <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approved
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">₹{stats.approvedAmt.toLocaleString("en-IN")}</p>
                </Card>
                <Card className="p-4 bg-white border-amber-200 shadow-xs rounded-2xl">
                    <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending
                    </p>
                    <p className="text-2xl font-black text-amber-700 mt-1">₹{stats.pendingAmt.toLocaleString("en-IN")}</p>
                </Card>
                <Card className="p-4 bg-white border-rose-200 shadow-xs rounded-2xl">
                    <p className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                    </p>
                    <p className="text-2xl font-black text-rose-700 mt-1">₹{stats.rejectedAmt.toLocaleString("en-IN")}</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Filter Branch</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Branches</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b._id} value={b._id}>
                                        {b.branchName || b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Transfer Type</label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="INTER_BRANCH">Inter-Branch</SelectItem>
                                <SelectItem value="INTER_MODULE">Inter-Module (MFI ↔ Personal)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Status</label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={fetchReport}
                        className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh Data
                    </Button>
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium text-sm animate-pulse">
                    Loading remittance records...
                </div>
            ) : remittances.length > 0 ? (
                <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Source</th>
                                    <th className="py-3 px-4">Destination</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                    <th className="py-3 px-4 text-center">Mode</th>
                                    <th className="py-3 px-4">Details</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4">Signoff</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {remittances.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {item.remittanceType === "INTER_MODULE" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                    <Layers className="w-3 h-3" />
                                                    Inter-Module
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    Inter-Branch
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900">
                                                {item.fromBranch?.name || item.fromBranch?.branchName || "-"}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                                                [{item.fromModule || "MFI"}]
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900">
                                                {item.toBranch?.name || item.toBranch?.branchName || "-"}
                                            </div>
                                            <span className="text-[10px] text-amber-600 font-semibold tracking-wider uppercase">
                                                [{item.toModule || "PERSONAL"}]
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-sm text-slate-900 whitespace-nowrap">
                                            ₹{item.amount?.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                {item.mode}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={item.details}>
                                            {item.details}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            {item.status === "APPROVED" && (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    Approved
                                                </span>
                                            )}
                                            {item.status === "PENDING" && (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    Pending
                                                </span>
                                            )}
                                            {item.status === "REJECTED" && (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                    Rejected
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                            <div>Req: {item.requestedBy?.name || "-"}</div>
                                            {item.approvedBy?.name && (
                                                <div className="text-slate-400 text-[10px]">Appr: {item.approvedBy.name}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-2">
                    <p className="text-base font-bold text-slate-800">No Remittances Found</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters to see more results.</p>
                </div>
            )}
        </section>
    );
}

