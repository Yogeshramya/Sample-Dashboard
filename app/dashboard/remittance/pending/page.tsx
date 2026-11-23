"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

interface Remittance {
    _id: string;
    date: string;
    fromBranch: { _id: string; name: string };
    toBranch: { _id: string; name: string };
    amount: number;
    mode: "Cash" | "Bank";
    details: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
}

export default function PendingRemittanceRequests() {
    const [requests, setRequests] = useState<Remittance[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadRequests = useCallback(async (showLoader = false) => {
        if (showLoader) {
            setLoading(true);
        }
        try {
            const res = await fetch("/api/remittance?status=PENDING");
            const data = await res.json();
            if (data.success) {
                setRequests(data.remittances || []);
            } else {
                toast.error("Failed to load requests");
            }
        } catch {
            toast.error("Error loading pending requests");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function initFetch() {
            try {
                const res = await fetch("/api/remittance?status=PENDING");
                const data = await res.json();
                if (isMounted) {
                    if (data.success) {
                        setRequests(data.remittances || []);
                    } else {
                        toast.error("Failed to load requests");
                    }
                }
            } catch {
                if (isMounted) {
                    toast.error("Error loading pending requests");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        initFetch();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
        setActionId(id);
        try {
            const res = await fetch(`/api/remittance/${id}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Request ${action.toLowerCase()}d successfully!`);
                await loadRequests(false);
            } else {
                toast.error(data.error || `Failed to ${action.toLowerCase()} request`);
            }
        } catch {
            toast.error("Error processing action");
        } finally {
            setActionId(null);
        }
    };

    return (
        <section className="max-w-7xl mx-auto space-y-8">
            <PageHeader />
            <h1 className="text-3xl font-bold text-amber-500">PENDING REMITTANCE REQUESTS</h1>

            {loading ? (
                <p className="text-center py-6">Loading pending requests...</p>
            ) : requests.length > 0 ? (
                <Card className="p-4 overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200">
                        <thead className="bg-slate-800 text-white">
                            <tr className="text-center">
                                <th className="border p-2">Date</th>
                                <th className="border p-2">From Branch</th>
                                <th className="border p-2">To Branch</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Mode</th>
                                <th className="border p-2">Details</th>
                                <th className="border p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((item) => (
                                <tr key={item._id} className="text-center hover:bg-slate-50">
                                    <td className="border p-2">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="border p-2 font-semibold">{item.fromBranch?.name || "-"}</td>
                                    <td className="border p-2 font-semibold">{item.toBranch?.name || "-"}</td>
                                    <td className="border p-2 font-bold text-green-600">₹{item.amount}</td>
                                    <td className="border p-2">{item.mode}</td>
                                    <td className="border p-2 text-left">{item.details}</td>
                                    <td className="border p-2">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                disabled={actionId === item._id}
                                                onClick={() => handleAction(item._id, "APPROVE")}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={actionId === item._id}
                                                onClick={() => handleAction(item._id, "REJECT")}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <p className="text-center text-slate-500 py-6">No pending remittance requests found.</p>
            )}
        </section>
    );
}