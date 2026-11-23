"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import LoadingOverlay from "@/components/Loading";

interface DebitItem {
    _id: string;
    code?: string;
    date: string;
    title: string;
    details: string;
    amount: number;
    mode: string;
    status: string;
    employee?: { name: string };
    branch?: { name: string };
}

export default function PersonalManageDebit() {
    const router = useRouter();
    const [debits, setDebits] = useState<DebitItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 15;

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/personal/debit?page=${page}&limit=${limit}&status=ALL`);
            const data = await res.json();

            if (data.success && data.records) {
                setDebits(data.records);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                }
            } else {
                toast.error(data.error || "Failed to load expenses");
            }
        } catch {
            toast.error("Failed to load savings expenses");
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = async (id: string, code?: string) => {
        if (!confirm(`Are you sure you want to delete expense ${code || ""}? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/personal/debit/${id}`, { method: "DELETE" });
            const result = await res.json();

            if (result.success) {
                toast.success("Expense deleted successfully");
                loadData();
            } else {
                toast.error(result.error || "Failed to delete expense");
            }
        } catch {
            toast.error("Error deleting expense");
        }
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal/debit")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Manage Savings Expenses
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Review, audit, or remove operational expenses for Smart Savings.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        className="rounded-xl gap-1 text-xs font-semibold"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => router.push("/dashboard/personal/debit/entry")}
                        className="bg-slate-900 text-amber-400 font-bold rounded-xl text-xs"
                    >
                        + New Expense
                    </Button>
                </div>
            </div>

            <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-3">Code</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Title</th>
                                <th className="p-3">Details</th>
                                <th className="p-3">Staff</th>
                                <th className="p-3">Mode</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-400">
                                        Loading records...
                                    </td>
                                </tr>
                            ) : debits.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                                        No savings expenses recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                debits.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-mono font-bold text-amber-700">
                                            {item.code || "-"}
                                        </td>
                                        <td className="p-3 text-slate-600 font-mono">
                                            {new Date(item.date).toLocaleDateString("en-GB")}
                                        </td>
                                        <td className="p-3 font-bold text-slate-900">
                                            {item.title}
                                        </td>
                                        <td className="p-3 text-slate-600 max-w-xs truncate">
                                            {item.details}
                                        </td>
                                        <td className="p-3 text-slate-700">
                                            {item.employee?.name || "-"}
                                        </td>
                                        <td className="p-3 font-semibold text-slate-600">
                                            {item.mode}
                                        </td>
                                        <td className="p-3 text-right font-black text-rose-600 text-sm font-mono">
                                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                                                    item.status === "APPROVED"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : item.status === "REJECTED"
                                                        ? "bg-rose-100 text-rose-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleDelete(item._id, item.code)}
                                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-lg text-xs"
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg text-xs"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </section>
    );
}

