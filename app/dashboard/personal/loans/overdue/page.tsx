"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    Search,
    Phone,
    Printer,
    Coins,
    Calendar,
    Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument, IPersonalLoanDueItem } from "@/types/personal-loan";

export default function OverdueArrearsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");
    const [agingFilter, setAgingFilter] = useState("ALL");

    const loadOverdue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=OVERDUE,ACTIVE");
            const data = await res.json();
            if (data.success && data.loans) {
                // Filter only loans having overdue dues past due date
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdueList = data.loans.filter((ln: IPersonalLoanDocument) => {
                    const dues = (ln.dues || []) as IPersonalLoanDueItem[];
                    return dues.some((d) => !d.isPaid && new Date(d.dueDate) < today);
                });

                setLoans(overdueList);
            }
        } catch {
            toast.error("Failed to load overdue loans");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOverdue();
    }, [loadOverdue]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    // Calculate DPD for a loan
    const calculateDPD = (ln: IPersonalLoanDocument): number => {
        const today = new Date();
        const dues = (ln.dues || []) as IPersonalLoanDueItem[];
        const unpaidPastDue = dues.filter((d) => !d.isPaid && new Date(d.dueDate) < today);
        if (!unpaidPastDue.length) return 0;

        const oldestDue = new Date(unpaidPastDue[0].dueDate);
        const diffMs = today.getTime() - oldestDue.getTime();
        return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    };

    // Calculate overdue amount
    const calculateOverdueAmount = (ln: IPersonalLoanDocument): number => {
        const today = new Date();
        const dues = (ln.dues || []) as IPersonalLoanDueItem[];
        return dues
            .filter((d) => !d.isPaid && new Date(d.dueDate) < today)
            .reduce((sum, d) => sum + (d.remainingAmount || d.totalDue), 0);
    };

    const enriched = loans.map((l) => ({
        ...l,
        dpd: calculateDPD(l),
        overdueAmount: calculateOverdueAmount(l),
    }));

    const filtered = enriched.filter((ln) => {
        const q = search.toLowerCase();
        const id = ln.loanId.toLowerCase();
        const cust = typeof ln.customer === "object" ? ln.customer.fullName.toLowerCase() : "";
        const phone = typeof ln.customer === "object" ? ln.customer.mobile : "";
        const matchSearch = id.includes(q) || cust.includes(q) || phone.includes(q);

        if (!matchSearch) return false;
        if (agingFilter === "1-15") return ln.dpd >= 1 && ln.dpd <= 15;
        if (agingFilter === "16-30") return ln.dpd >= 16 && ln.dpd <= 30;
        if (agingFilter === "31-60") return ln.dpd >= 31 && ln.dpd <= 60;
        if (agingFilter === "60+") return ln.dpd > 60;
        return true;
    });

    const totalOverdueAmount = enriched.reduce((sum, l) => sum + l.overdueAmount, 0);

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Overdue &amp; Arrears Recovery Desk
                    </h1>
                    <p className="text-xs text-slate-500">
                        Delinquency tracking across aging brackets (DPD 1-15, 16-30, 31-60, 60+ days)
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="rounded-xl border border-slate-300 font-bold text-xs cursor-pointer shadow-xs"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                    Print Arrears List
                </Button>
            </div>

            <LoanNav />

            {/* AGING BRACKETS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card
                    onClick={() => setAgingFilter("1-15")}
                    className={`rounded-2xl border cursor-pointer transition-all ${
                        agingFilter === "1-15" ? "border-amber-500 bg-amber-50/50" : "border-slate-200 bg-white"
                    }`}
                >
                    <CardContent className="p-4">
                        <span className="text-[11px] font-bold text-amber-700 uppercase">1 - 15 Days (Mild)</span>
                        <div className="text-xl font-black text-slate-900 mt-1">
                            {enriched.filter((l) => l.dpd >= 1 && l.dpd <= 15).length} loans
                        </div>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setAgingFilter("16-30")}
                    className={`rounded-2xl border cursor-pointer transition-all ${
                        agingFilter === "16-30" ? "border-amber-600 bg-amber-50/50" : "border-slate-200 bg-white"
                    }`}
                >
                    <CardContent className="p-4">
                        <span className="text-[11px] font-bold text-amber-800 uppercase">16 - 30 Days (Moderate)</span>
                        <div className="text-xl font-black text-slate-900 mt-1">
                            {enriched.filter((l) => l.dpd >= 16 && l.dpd <= 30).length} loans
                        </div>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setAgingFilter("31-60")}
                    className={`rounded-2xl border cursor-pointer transition-all ${
                        agingFilter === "31-60" ? "border-rose-500 bg-rose-50/50" : "border-slate-200 bg-white"
                    }`}
                >
                    <CardContent className="p-4">
                        <span className="text-[11px] font-bold text-rose-700 uppercase">31 - 60 Days (Severe)</span>
                        <div className="text-xl font-black text-rose-700 mt-1">
                            {enriched.filter((l) => l.dpd >= 31 && l.dpd <= 60).length} loans
                        </div>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setAgingFilter("60+")}
                    className={`rounded-2xl border cursor-pointer transition-all ${
                        agingFilter === "60+" ? "border-rose-700 bg-rose-100/50" : "border-slate-200 bg-white"
                    }`}
                >
                    <CardContent className="p-4">
                        <span className="text-[11px] font-bold text-rose-900 uppercase">60+ Days (Critical)</span>
                        <div className="text-xl font-black text-rose-900 mt-1">
                            {enriched.filter((l) => l.dpd > 60).length} loans
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* OVERDUE TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Overdue Arrears Accounts ({filtered.length})
                            </h2>
                            <p className="text-xs text-rose-700 font-bold">
                                Total Overdue Demand: {formatCurrency(totalOverdueAmount)}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs rounded-xl"
                                onClick={() => setAgingFilter("ALL")}
                            >
                                Reset Filter
                            </Button>
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
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-left">Borrower & Phone</th>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-center">Frequency</th>
                                    <th className="p-3 text-center">Days Past Due (DPD)</th>
                                    <th className="p-3 text-right">Overdue Amount</th>
                                    <th className="p-3 text-right">Total Outstanding</th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">
                                            No delinquent / overdue loans in this category.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900">{cust?.fullName}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {cust?.mobile}
                                                    </div>
                                                </td>
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {ln.repaymentFrequency}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                                            ln.dpd > 60
                                                                ? "bg-rose-600 text-white animate-pulse"
                                                                : ln.dpd > 30
                                                                  ? "bg-rose-100 text-rose-800"
                                                                  : "bg-amber-100 text-amber-800"
                                                        }`}
                                                    >
                                                        {ln.dpd} Days
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700 text-sm">
                                                    {formatCurrency(ln.overdueAmount)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-800">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 px-3 text-[11px] rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/dashboard/personal/loans/collections/weekly?loanId=${ln._id}`
                                                                )
                                                            }
                                                        >
                                                            Collect
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                                            onClick={() =>
                                                                router.push(`/dashboard/personal/loans/${ln._id}/ledger`)
                                                            }
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

