"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    Printer,
    FileSpreadsheet,
    Banknote,
    Receipt,
    Coins,
    Lock,
    Scale,
    AlertTriangle,
    ArrowLeft,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanReportsMasterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [reportType, setReportType] = useState<"ALL" | "DISBURSEMENT" | "ARREARS" | "CLOSURE">("ALL");

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans");
            const data = await res.json();
            if (data.success && data.loans) {
                setLoans(data.loans);
            }
        } catch {
            toast.error("Failed to load master loan report data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const formatDate = (d: string | Date | null | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getReportData = () => {
        if (reportType === "DISBURSEMENT") {
            return loans.filter((l) =>
                ["DISBURSED", "ACTIVE", "OVERDUE", "CLOSED", "PRECLOSED"].includes(l.status)
            );
        } else if (reportType === "ARREARS") {
            return loans.filter((l) => l.status === "OVERDUE" || (l.status === "ACTIVE" && l.totalOutstanding > 0));
        } else if (reportType === "CLOSURE") {
            return loans.filter((l) => l.status === "CLOSED" || l.status === "PRECLOSED");
        }
        return loans;
    };

    const reportData = getReportData();

    const handleExportCSV = () => {
        const headers = ["Loan ID", "Borrower Name", "Phone", "Frequency", "Sanction Amount", "Disbursed Date", "Outstanding", "Status"];
        const rows = reportData.map((l) => {
            const cust = typeof l.customer === "object" ? l.customer : null;
            return [
                l.loanId,
                `"${cust?.fullName || ""}"`,
                cust?.mobile || "",
                l.repaymentFrequency,
                l.loanAmount,
                l.disbursedAt ? new Date(l.disbursedAt).toISOString().split("T")[0] : "",
                l.totalOutstanding,
                l.status,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Personal_Loan_Master_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV report downloaded successfully");
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-2">
            <LoadingOverlay show={loading} />
            <div className="print:hidden">
                <PageHeader />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4 print:hidden">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Personal Loan Master Reporting &amp; Audit Suite
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Comprehensive loan book registers and dedicated report hubs for regulatory and branch audits
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={handleExportCSV}
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={() => window.print()}
                    >
                        <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border border-emerald-200 text-[#241E4E] hover:bg-emerald-50 font-bold text-xs cursor-pointer shadow-xs"
                        onClick={() => router.push("/dashboard/personal/report")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Report Hub
                    </Button>
                </div>
            </div>

            {/* SEPARATE REPORT PAGES DIRECT SHORTCUTS */}
            <div className="print:hidden space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        Dedicated Report Pages (1-Click Access)
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal/report/disbursement")}
                        className="p-3 bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-md rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                    >
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-2">
                            <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                Disbursements <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">Sanction register</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/personal/report/collections")}
                        className="p-3 bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-md rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                    >
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-800 w-fit mb-2">
                            <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                Collections <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">Installment receipts</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/personal/report/arrears")}
                        className="p-3 bg-white border border-slate-200 hover:border-rose-600 hover:shadow-md rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                    >
                        <div className="p-2 rounded-xl bg-rose-100 text-rose-800 w-fit mb-2">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                Arrears &amp; Dues <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">Delinquency aging</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/personal/report/outstanding")}
                        className="p-3 bg-white border border-slate-200 hover:border-amber-600 hover:shadow-md rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                    >
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 w-fit mb-2">
                            <Scale className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                Outstanding <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">Active balances</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/personal/report/closure")}
                        className="p-3 bg-white border border-slate-200 hover:border-purple-600 hover:shadow-md rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                    >
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-800 w-fit mb-2">
                            <Lock className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                Closures <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">Settled &amp; preclosed</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* MASTER AUDIT TABLE */}
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Personal Loan Master Book ({reportData.length} total records)
                        </h2>

                        <div className="flex items-center gap-1.5 print:hidden">
                            {(["ALL", "DISBURSEMENT", "ARREARS", "CLOSURE"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setReportType(t)}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                                        reportType === t
                                            ? "bg-[#241E4E] text-[#7C5CFC]"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-left">Borrower Name</th>
                                    <th className="p-3 text-left">Mobile</th>
                                    <th className="p-3 text-center">Frequency</th>
                                    <th className="p-3 text-right">Sanction Amount</th>
                                    <th className="p-3 text-left">Disbursed Date</th>
                                    <th className="p-3 text-right">Principal Repaid</th>
                                    <th className="p-3 text-right font-black">Outstanding</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-400">
                                            No records matching this report category.
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3 font-bold text-slate-900">
                                                    <div>{cust?.fullName || "—"}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{cust?.clientId}</div>
                                                </td>
                                                <td className="p-3 text-slate-600">{cust?.mobile || "—"}</td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {ln.repaymentFrequency}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-black text-slate-900">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-slate-600">
                                                    {formatDate(ln.disbursedAt)}
                                                </td>
                                                <td className="p-3 text-right text-emerald-700 font-bold">
                                                    {formatCurrency(ln.totalPrincipalRepaid)}
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            ln.status === "ACTIVE"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : ln.status === "CLOSED" || ln.status === "PRECLOSED"
                                                                  ? "bg-slate-100 text-slate-700"
                                                                  : ln.status === "OVERDUE"
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : "bg-blue-100 text-blue-800"
                                                        }`}
                                                    >
                                                        {ln.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center print:hidden">
                                                    <button
                                                        onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/ledger`)}
                                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#241E4E] text-[#7C5CFC] hover:bg-[#241E4E] transition cursor-pointer"
                                                    >
                                                        Ledger
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
