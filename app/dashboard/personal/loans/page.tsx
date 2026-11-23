"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Coins,
    Banknote,
    Users,
    AlertTriangle,
    PlusCircle,
    CheckCircle2,
    CalendarCheck,
    Clock,
    Scale,
    ArrowUpRight,
    Search,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

interface PortfolioStats {
    totalCount: number;
    totalSanctioned: number;
    totalDisbursed: number;
    totalOutstanding: number;
    totalPrincipalRepaid: number;
    activeLoansCount: number;
    overdueLoansCount: number;
    pendingApprovalCount: number;
}

export default function PersonalLoansHubPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [stats, setStats] = useState<PortfolioStats | null>(null);
    const [search, setSearch] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
                setStats(data.stats || null);
            } else {
                toast.error(data.error || "Failed to load personal loans");
            }
        } catch {
            toast.error("Network error loading personal loans");
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

    const filteredLoans = loans.filter((ln) => {
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
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold uppercase tracking-wider">
                        <Coins className="w-3.5 h-3.5 text-[#7C5CFC]" />
                        Smart Savings Linked Lending
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                        Personal Loan Management
                    </h1>
                    <p className="text-slate-600 font-medium text-xs md:text-sm mt-0.5">
                        Credit facility for eligible scheme customers (≥ ₹3,000 monthly contribution for 3+ months)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        className="bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-bold border border-[#7C5CFC]/40 rounded-xl cursor-pointer shadow-sm text-xs"
                        onClick={() => router.push("/dashboard/personal/loans/eligibility")}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-1 text-[#7C5CFC]" />
                        Check Eligibility
                    </Button>
                    <Button
                        className="bg-[#7C5CFC] hover:bg-[#d97706] text-slate-950 font-black rounded-xl cursor-pointer shadow-sm text-xs"
                        onClick={() => router.push("/dashboard/personal/loans/new")}
                    >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Apply Personal Loan
                    </Button>
                </div>
            </div>

            <LoanNav />

            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Active Portfolio</span>
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                                <Banknote className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(stats?.totalOutstanding || 0)}
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            {stats?.activeLoansCount || 0} active running loans
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Disbursed</span>
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <Coins className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(stats?.totalDisbursed || 0)}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Cumulative cash & bank disbursements
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Recovered</span>
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                                <Scale className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                            {formatCurrency(stats?.totalPrincipalRepaid || 0)}
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 mt-1">
                            Principal repayments received
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Pending Review</span>
                            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-rose-600 mt-2">
                            {stats?.pendingApprovalCount || 0}
                        </div>
                        <p className="text-[11px] font-semibold text-rose-600 mt-1">
                            Awaiting verification / approval
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* QUICK ACTIONS HUB GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                    onClick={() => router.push("/dashboard/personal/loans/new")}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white hover:opacity-95 text-left transition-all shadow-xs cursor-pointer border border-[#7C5CFC]/30"
                >
                    <PlusCircle className="w-5 h-5 text-[#7C5CFC] mb-2" />
                    <div className="text-xs font-bold">New Loan</div>
                    <div className="text-[10px] text-emerald-200/80">Manual amount entry</div>
                </button>

                <button
                    onClick={() => router.push("/dashboard/personal/loans/eligibility")}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 text-slate-900 text-left transition-all shadow-xs cursor-pointer"
                >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                    <div className="text-xs font-bold">Eligibility Check</div>
                    <div className="text-[10px] text-slate-500">3-mo ₹3000+ audit</div>
                </button>

                <button
                    onClick={() => router.push("/dashboard/personal/loans/collections/daily")}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-amber-600 text-slate-900 text-left transition-all shadow-xs cursor-pointer"
                >
                    <CalendarCheck className="w-5 h-5 text-amber-600 mb-2" />
                    <div className="text-xs font-bold">Daily Collection</div>
                    <div className="text-[10px] text-slate-500">Fast batch entry</div>
                </button>

                <button
                    onClick={() => router.push("/dashboard/personal/loans/collections/weekly")}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-slate-900 text-left transition-all shadow-xs cursor-pointer"
                >
                    <Clock className="w-5 h-5 text-blue-600 mb-2" />
                    <div className="text-xs font-bold">Weekly / EMI</div>
                    <div className="text-[10px] text-slate-500">Installment receipts</div>
                </button>

                <button
                    onClick={() => router.push("/dashboard/personal/loans/disbursement")}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-700 text-slate-900 text-left transition-all shadow-xs cursor-pointer"
                >
                    <Banknote className="w-5 h-5 text-emerald-700 mb-2" />
                    <div className="text-xs font-bold">Disbursement</div>
                    <div className="text-[10px] text-slate-500">Payout & Daysheet debit</div>
                </button>

                <button
                    onClick={() => router.push("/dashboard/personal/loans/closure")}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-purple-600 text-slate-900 text-left transition-all shadow-xs cursor-pointer"
                >
                    <ArrowUpRight className="w-5 h-5 text-purple-600 mb-2" />
                    <div className="text-xs font-bold">Loan Closure</div>
                    <div className="text-[10px] text-slate-500">Pre-closure & NOC</div>
                </button>
            </div>

            {/* RECENT LOANS TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base md:text-lg font-black text-slate-900">
                                Recent Personal Loans
                            </h2>
                            <p className="text-xs text-slate-500">
                                Showing {filteredLoans.length} of {loans.length} recorded loans
                            </p>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Loan ID, Name, Phone..."
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
                                    <th className="p-3 text-left">Customer</th>
                                    <th className="p-3 text-left">Account</th>
                                    <th className="p-3 text-right">Sanction Amount</th>
                                    <th className="p-3 text-center">Frequency</th>
                                    <th className="p-3 text-right">Outstanding</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLoans.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">
                                            No personal loans found. Click &quot;Apply Personal Loan&quot; to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.slice(0, 15).map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;
                                        const acc = typeof ln.personalAccount === "object" ? ln.personalAccount : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900">{cust?.fullName || "—"}</div>
                                                    <div className="text-[10px] text-slate-500">{cust?.mobile || ""}</div>
                                                </td>
                                                <td className="p-3 font-mono text-slate-600">
                                                    {acc?.accountNumber || "—"}
                                                </td>
                                                <td className="p-3 text-right font-black text-[#241E4E]">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {ln.repaymentFrequency}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-bold text-rose-700">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                                            ln.status === "ACTIVE"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : ln.status === "APPROVED"
                                                                  ? "bg-amber-100 text-amber-800"
                                                                  : ln.status === "CLOSED" || ln.status === "PRECLOSED"
                                                                    ? "bg-slate-100 text-slate-700"
                                                                    : ln.status === "OVERDUE"
                                                                      ? "bg-rose-100 text-rose-800 animate-pulse"
                                                                      : "bg-blue-100 text-blue-800"
                                                        }`}
                                                    >
                                                        {ln.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                                            onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/schedule`)}
                                                        >
                                                            <Eye className="w-3 h-3 mr-1" />
                                                            Schedule
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                                            onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/ledger`)}
                                                        >
                                                            Ledger
                                                        </Button>
                                                    </div>
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

