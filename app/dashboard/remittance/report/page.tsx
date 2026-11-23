"use client";

import { useEffect, useState, useCallback } from "react";
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
import PageHeader from "@/components/PageHeader";

interface Remittance {
    _id: string;
    date: string;
    fromBranch: { _id: string; branchName: string };
    toBranch: { _id: string; branchName: string };
    amount: number;
    mode: string;
    details: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Branch {
    _id: string;
    branchName: string;
}

export default function RemittanceReport() {
    const [remittances, setRemittances] = useState<Remittance[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [loading, setLoading] = useState(false);

    // Initial load: branches
    useEffect(() => {
        let isMounted = true;

        fetch("/api/branches/list")
            .then((r) => r.json())
            .then((data) => {
                if (isMounted) {
                    setBranches(Array.isArray(data) ? data : data.branches || []);
                }
            })
            .catch(() => toast.error("Failed to load branches"));

        return () => {
            isMounted = false;
        };
    }, []);

    // Manual refresh action
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedBranch !== "ALL") params.append("branchId", selectedBranch);
            if (selectedStatus !== "ALL") params.append("status", selectedStatus);

            const queryString = params.toString();
            const url = `/api/remittance${queryString ? `?${queryString}` : ""}`;

            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setRemittances(data.remittances || []);
            } else {
                toast.error("Failed to fetch report");
            }
        } catch {
            toast.error("Error fetching report");
        } finally {
            setLoading(false);
        }
    }, [selectedBranch, selectedStatus]);

    // Query on filter changes
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (selectedBranch !== "ALL") params.append("branchId", selectedBranch);
                if (selectedStatus !== "ALL") params.append("status", selectedStatus);

                const queryString = params.toString();
                const url = `/api/remittance${queryString ? `?${queryString}` : ""}`;

                const res = await fetch(url);
                const data = await res.json();
                if (isMounted) {
                    if (data.success) {
                        setRemittances(data.remittances || []);
                    } else {
                        toast.error("Failed to fetch report");
                    }
                }
            } catch {
                if (isMounted) {
                    toast.error("Error fetching report");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [selectedBranch, selectedStatus]);

    return (
        <section className="max-w-7xl mx-auto space-y-8">
            <PageHeader />
            <h1 className="text-3xl font-bold text-slate-800">REMITTANCE REPORT</h1>

            {/* Filters */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Branch</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Branches</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b._id} value={b._id}>
                                        {b.branchName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Button
                            onClick={fetchReport}
                            className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            Refresh Report
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <p className="text-center py-6">Loading report...</p>
            ) : remittances.length > 0 ? (
                <Card className="p-4 overflow-x-auto">
                    <table className="w-full text-sm border">
                        <thead className="bg-slate-800 text-white">
                            <tr className="text-center">
                                <th className="border p-2">Date</th>
                                <th className="border p-2">From Branch</th>
                                <th className="border p-2">To Branch</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Mode</th>
                                <th className="border p-2">Details</th>
                                <th className="border p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {remittances.map((r) => (
                                <tr key={r._id} className="text-center hover:bg-slate-50">
                                    <td className="border p-2">{new Date(r.date).toLocaleDateString()}</td>
                                    <td className="border p-2 font-medium">{r.fromBranch?.branchName || "-"}</td>
                                    <td className="border p-2 font-medium">{r.toBranch?.branchName || "-"}</td>
                                    <td className="border p-2 font-bold text-amber-700">₹{r.amount}</td>
                                    <td className="border p-2">{r.mode}</td>
                                    <td className="border p-2 text-left">{r.details}</td>
                                    <td className="border p-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold ${r.status === "APPROVED"
                                                    ? "bg-green-100 text-green-700"
                                                    : r.status === "REJECTED"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-800"
                                                }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <p className="text-center text-slate-500 py-6">No remittance records found.</p>
            )}
        </section>
    );
}