"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Search,
    Eye,
    Receipt,
    PlusCircle,
    Calendar,
    Phone,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanCustomersListPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [frequencyFilter, setFrequencyFilter] = useState("ALL");

    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            if (frequencyFilter !== "ALL") params.set("frequency", frequencyFilter);

            const res = await fetch(`/api/personal/loans?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            } else {
                toast.error(data.error || "Failed to load borrowers");
            }
        } catch {
            toast.error("Network error loading borrowers");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, frequencyFilter]);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const filtered = loans.filter((ln) => {
        const q = search.toLowerCase();
        const id = ln.loanId.toLowerCase();
        const cust = typeof ln.customer === "object" ? ln.customer.fullName.toLowerCase() : "";
        const phone = typeof ln.customer === "object" ? ln.customer.mobile : "";
        const acc = typeof ln.personalAccount === "object" ? ln.personalAccount.accountNumber.toLowerCase() : "";
        return id.includes(q) || cust.includes(q) || phone.includes(q) || acc.includes(q);
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Personal Loan Borrowers Directory
                    </h1>
                    <p className="text-xs text-slate-500">
                        Complete portfolio of savings-linked personal loan customers and running accounts
                    </p>
                </div>
            </div>

            {/* FILTERS & SEARCH BAR */}
            <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Borrower Name, Phone, Loan ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-600"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active Running</option>
                            <option value="APPROVED">Approved (Awaiting Payout)</option>
                            <option value="OVERDUE">Overdue / Arrears</option>
                            <option value="APPLIED">Applied / In Review</option>
                            <option value="CLOSED">Closed & Settled</option>
                        </select>

                        <select
                            value={frequencyFilter}
                            onChange={(e) => setFrequencyFilter(e.target.value)}
                            className="p-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                        >
                            <option value="ALL">All Frequencies</option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* BORROWERS DATA TABLE */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3 text-left">Borrower & Phone</th>
                                    <th className="p-3 text-left">Loan ID</th>
                                    <th className="p-3 text-left">Savings Account</th>
                                    <th className="p-3 text-right">Sanction Amount</th>
                                    <th className="p-3 text-center">Frequency & Tenure</th>
                                    <th className="p-3 text-right">Outstanding</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">
                                            No borrowers matching the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((ln) => {
                                        const cust = typeof ln.customer === "object" ? ln.customer : null;
                                        const acc = typeof ln.personalAccount === "object" ? ln.personalAccount : null;

                                        return (
                                            <tr key={ln._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900">{cust?.fullName || "—"}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {cust?.mobile || ""}
                                                    </div>
                                                </td>
                                                <td className="p-3 font-mono font-bold text-emerald-950">
                                                    {ln.loanId}
                                                </td>
                                                <td className="p-3 font-mono text-slate-600">
                                                    {acc?.accountNumber || "—"}
                                                </td>
                                                <td className="p-3 text-right font-black text-slate-900">
                                                    {formatCurrency(ln.loanAmount)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="font-bold text-slate-700">{ln.repaymentFrequency}</div>
                                                    <div className="text-[10px] text-slate-400">{ln.tenureUnits} installments</div>
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-700">
                                                    {formatCurrency(ln.totalOutstanding)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${ln.status === "ACTIVE"
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
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            Schedule
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                                            onClick={() => router.push(`/dashboard/personal/loans/${ln._id}/ledger`)}
                                                        >
                                                            <FileText className="w-3 h-3 mr-1" />
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

