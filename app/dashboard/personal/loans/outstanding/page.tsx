"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Scale,
    Search,
    Printer,
    Coins,
    Banknote,
    TrendingUp,
    AlertTriangle,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function OutstandingPortfolioPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=ACTIVE,OVERDUE,DISBURSED");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            } else {
                toast.error(data.error || "Failed to load outstanding portfolio");
            }
        } catch {
            toast.error("Network error loading portfolio");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const totalPrincipalDisbursed = loans.reduce((acc, l) => acc + (Number(l.loanAmount) || 0), 0);
    const totalPrincipalOutstanding = loans.reduce((acc, l) => acc + (Number(l.principalOutstanding) || 0), 0);
    const totalInterestOutstanding = loans.reduce((acc, l) => acc + (Number(l.interestOutstanding) || 0), 0);
    const totalPrincipalRepaid = loans.reduce((acc, l) => acc + (Number(l.totalPrincipalRepaid) || 0), 0);
    const totalGrossOutstanding = loans.reduce((acc, l) => acc + (Number(l.totalOutstanding) || 0), 0);

    const filtered = loans.filter((ln) => {
        const q = search.toLowerCase();
        const id = ln.loanId.toLowerCase();
        const cust = typeof ln.customer === "object" ? ln.customer.fullName.toLowerCase() : "";
        const phone = typeof ln.customer === "object" ? ln.customer.mobile : "";
        return id.includes(q) || cust.includes(q) || phone.includes(q);
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Personal Loan Outstanding Portfolio &amp; Exposure
                    </h1>
                    <p className="text-xs text-slate-500">
                        Real-time ledger tracking active principal exposure, unearned interest, and collection recovery
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                    Print Portfolio Statement
                </Button>
            </div>

            <LoanNav />

            {/* KPI STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Principal Outstanding</span>
                        <div className="text-xl md:text-2xl font-black text-rose-700 mt-2">
                            {formatCurrency(totalPrincipalOutstanding)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Current active capital at risk
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Interest Outstanding</span>
                        <div className="text-xl md:text-2xl font-black text-[#d97706] mt-2">
                            {formatCurrency(totalInterestOutstanding)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Pending interest to be realized
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Principal Recovered</span>
                        <div className="text-xl md:text-2xl font-black text-[#241E4E] mt-2">
                            {formatCurrency(totalPrincipalRepaid)}
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            Total principal received back
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Gross Dues</span>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(totalGrossOutstanding)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Across {loans.length} active running accounts
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* OUTSTANDING TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Active Outstanding Accounts ({filtered.length})
                        </h2>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Borrower, Phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-600"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-left">Borrower Name</th>
                                    <th className="p-3 text-right">Disbursed Principal</th>
                                    <th className="p-3 text-right">Principal Repaid</th>
                                    <th className="p-3 text-right text-rose-300">Principal Due</th>
                                    <th className="p-3 text-right text-amber-300">Interest Due</th>
                                    <th className="p-3 text-right font-black">Total Outstanding</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">
                                            No active loans found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900">{cust?.fullName}</div>
                                                    <div className="text-[10px] text-slate-500">{cust?.mobile}</div>
                                                </td>
                                                <td className="p-3 text-right text-slate-800">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-right text-emerald-700 font-bold">
                                                    {formatCurrency(ln.totalPrincipalRepaid)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-rose-700">
                                                    {formatCurrency(ln.principalOutstanding)}
                                                </td>
                                                <td className="p-3 text-right text-amber-700 font-semibold">
                                                    {formatCurrency(ln.interestOutstanding)}
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700 text-sm">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                                        onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/ledger`)}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Ledger
                                                    </Button>
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

