"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ArrowLeft, Printer, Download, Search } from "lucide-react";
import { getTodayIST } from "@/lib/ist";

interface CreditItem {
    _id: string;
    date: string;
    title: string;
    details: string;
    amount: number;
    mode: string;
    status: string;
    employee?: { name: string };
    branch?: { name: string };
}

export default function PersonalCreditReport() {
    const router = useRouter();
    const today = getTodayIST();

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [titleFilter, setTitleFilter] = useState("ALL");
    const [titles, setTitles] = useState<{ _id: string; title: string }[]>([]);

    const [credits, setCredits] = useState<CreditItem[]>([]);
    const [grandTotal, setGrandTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/personal/credit/title")
            .then((r) => r.json())
            .then((d) => d.success && setTitles(d.titles || []))
            .catch(() => {});
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                start: startDate,
                end: endDate,
                status: "APPROVED",
            });
            if (titleFilter !== "ALL") params.append("title", titleFilter);

            const res = await fetch(`/api/personal/credit?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setCredits(data.records || []);
                setGrandTotal(data.grandTotal || 0);
            } else {
                toast.error(data.error || "Failed to load report");
            }
        } catch {
            toast.error("Error generating report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const handleExportCSV = () => {
        if (credits.length === 0) return toast.error("No records to export");

        const headers = ["Date", "Title", "Details", "Staff", "Mode", "Amount"];
        const rows = credits.map((c) => [
            new Date(c.date).toLocaleDateString("en-GB"),
            `"${c.title}"`,
            `"${c.details}"`,
            c.employee?.name || "",
            c.mode,
            c.amount,
        ]);
        rows.push(["", "", "", "", "TOTAL", grandTotal]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Savings_Income_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal/credit")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Smart Savings Income Report
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Official miscellaneous income statements and audit register for Smart Savings.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportCSV}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => window.print()}
                        className="bg-slate-900 text-amber-400 font-bold rounded-xl text-xs gap-1.5"
                    >
                        <Printer className="w-3.5 h-3.5" /> Print Statement
                    </Button>
                </div>
            </div>

            {/* Filter Card */}
            <Card className="p-4 bg-white border border-slate-200 shadow-xs print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                        <label className="text-2xs font-bold uppercase text-slate-600">From Date</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-xl h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-2xs font-bold uppercase text-slate-600">To Date</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-xl h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-2xs font-bold uppercase text-slate-600">Income Category</label>
                        <select
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium"
                        >
                            <option value="ALL">All Categories</option>
                            {titles.map((t) => (
                                <option key={t._id} value={t.title}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        onClick={fetchReport}
                        disabled={loading}
                        className="h-9 rounded-xl bg-slate-900 text-amber-400 font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Search className="w-3.5 h-3.5" />
                        {loading ? "Generating..." : "Generate Report"}
                    </Button>
                </div>
            </Card>

            {/* Total Metric Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-emerald-50 to-white border border-emerald-200">
                <div>
                    <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
                        Total Approved Savings Income
                    </span>
                    <h3 className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
                        ₹{grandTotal.toLocaleString("en-IN")}
                    </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                    {credits.length} Records found
                </span>
            </div>

            {/* Report Table */}
            <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-3 text-center">#</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Narration / Details</th>
                                <th className="p-3">Staff</th>
                                <th className="p-3">Mode</th>
                                <th className="p-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {credits.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                        No income recorded in this period.
                                    </td>
                                </tr>
                            ) : (
                                credits.map((item, idx) => (
                                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                                        <td className="p-3 text-slate-600 font-mono">
                                            {new Date(item.date).toLocaleDateString("en-GB")}
                                        </td>
                                        <td className="p-3 font-bold text-slate-900">{item.title}</td>
                                        <td className="p-3 text-slate-600 max-w-sm">{item.details}</td>
                                        <td className="p-3 text-slate-700">{item.employee?.name || "-"}</td>
                                        <td className="p-3 font-semibold text-slate-600">{item.mode}</td>
                                        <td className="p-3 text-right font-black text-emerald-700 font-mono text-sm">
                                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {credits.length > 0 && (
                            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                                <tr>
                                    <td colSpan={6} className="p-3 text-right uppercase tracking-wider">
                                        Grand Total Income:
                                    </td>
                                    <td className="p-3 text-right font-mono text-base text-emerald-800">
                                        ₹{grandTotal.toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>
        </section>
    );
}

