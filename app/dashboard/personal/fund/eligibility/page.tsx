"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CheckCircle2,
    XCircle,
    Search,
    ShieldCheck,
    Coins,
    Calendar,
    ArrowRight,
    User,
    PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { PersonalLoanEligibilityResponse } from "@/types/personal-loan";

export default function LoanEligibilityCheckPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<PersonalLoanEligibilityResponse | null>(null);
    const [searched, setSearched] = useState(false);

    const handleCheck = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) {
            return toast.error("Please enter a customer account number, phone, or name");
        }

        setLoading(true);
        setSearched(true);
        try {
            const res = await fetch(`/api/personal/loans/eligibility?account=${encodeURIComponent(query.trim())}`);
            const data = await res.json();
            if (data.success && data.eligibility) {
                setResult(data.eligibility);
            } else {
                setResult(null);
                toast.error(data.error || "No savings account found matching your query");
            }
        } catch {
            toast.error("Network error checking eligibility");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Personal Loan Eligibility Audit
                    </h1>
                    <p className="text-xs text-slate-500">
                        Verify customer qualifications: Scheme deposit ≥ ₹3,000 monthly with ≥ 3 active months tenure
                    </p>
                </div>
            </div>

            {/* SEARCH / AUDIT INPUT */}
            <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-5 md:p-6 space-y-4">
                    <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Enter Savings Account Number (e.g. YPS-0001)..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9 h-11 rounded-xl text-xs font-semibold border-slate-200 focus:border-emerald-600"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-bold rounded-xl h-11 px-6 text-xs cursor-pointer shadow-sm shrink-0"
                        >
                            <ShieldCheck className="w-4 h-4 mr-1.5" />
                            Run Eligibility Audit
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* AUDIT SCORECARD RESULTS */}
            {result ? (
                <div className="space-y-6">
                    <Card
                        className={`rounded-3xl shadow-sm overflow-hidden border-2 ${result.isEligible ? "border-emerald-500 bg-white" : "border-rose-400 bg-white"
                            }`}
                    >
                        <div
                            className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${result.isEligible
                                    ? "bg-gradient-to-r from-emerald-800 to-emerald-950 text-white"
                                    : "bg-gradient-to-r from-rose-800 to-rose-950 text-white"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
                                    {result.isEligible ? (
                                        <CheckCircle2 className="w-7 h-7 text-[#7C5CFC]" />
                                    ) : (
                                        <XCircle className="w-7 h-7 text-rose-300" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                                        Audit Verdict
                                    </div>
                                    <div className="text-xl md:text-2xl font-black">
                                        {result.isEligible
                                            ? "ELIGIBLE FOR PERSONAL LOAN"
                                            : "CURRENTLY NOT ELIGIBLE"}
                                    </div>
                                </div>
                            </div>

                            {result.isEligible && (
                                <Button
                                    onClick={() =>
                                        router.push(`/dashboard/personal/loans/new?account=${result.account.accountNumber}`)
                                    }
                                    className="bg-[#7C5CFC] hover:bg-[#d97706] text-slate-950 font-black rounded-xl px-5 text-xs uppercase tracking-wide cursor-pointer shadow-md"
                                >
                                    Proceed to New Application
                                    <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Button>
                            )}
                        </div>

                        <CardContent className="p-5 md:p-6 space-y-6">
                            {/* CUSTOMER & ACCOUNT SNAPSHOT */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                                <div>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-2">
                                        <User className="w-3.5 h-3.5 text-emerald-700" />
                                        Customer Information
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <p><strong>Name:</strong> {result.customer.fullName}</p>
                                        <p><strong>Client Code:</strong> {result.customer.clientId}</p>
                                        <p><strong>Phone:</strong> {result.customer.mobile}</p>
                                        <p><strong>Address:</strong> {result.customer.address || "—"}</p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-2">
                                        <PiggyBank className="w-3.5 h-3.5 text-amber-700" />
                                        Savings Account Standing
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <p><strong>Account Number:</strong> {result.account.accountNumber}</p>
                                        <p><strong>Scheme:</strong> {result.account.schemeName} ({result.account.frequency})</p>
                                        <p><strong>Total Deposited:</strong> {formatCurrency(result.account.totalDeposited)}</p>
                                        <p><strong>Account Status:</strong> <span className="font-bold text-emerald-700">{result.account.status}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* 4 CORE ELIGIBILITY CRITERIA BREAKDOWN */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                    Mandatory Policy Criteria Evaluation
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* CRITERION 1 */}
                                    <div
                                        className={`p-4 rounded-2xl border flex items-start gap-3 ${result.criteria.schemeMeetsMinimumDeposit
                                                ? "bg-emerald-50/60 border-emerald-200"
                                                : "bg-rose-50/60 border-rose-200"
                                            }`}
                                    >
                                        {result.criteria.schemeMeetsMinimumDeposit ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                        )}
                                        <div className="text-xs space-y-0.5">
                                            <div className="font-bold text-slate-900">
                                                Scheme Deposit ≥ ₹3,000 Monthly
                                            </div>
                                            <p className="text-slate-600">
                                                Current monthly equivalent: ₹{result.criteria.monthlyContribution.toLocaleString("en-IN")}/month.
                                            </p>
                                        </div>
                                    </div>

                                    {/* CRITERION 2 */}
                                    <div
                                        className={`p-4 rounded-2xl border flex items-start gap-3 ${result.criteria.hasThreeMonthsTenure
                                                ? "bg-emerald-50/60 border-emerald-200"
                                                : "bg-rose-50/60 border-rose-200"
                                            }`}
                                    >
                                        {result.criteria.hasThreeMonthsTenure ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                        )}
                                        <div className="text-xs space-y-0.5">
                                            <div className="font-bold text-slate-900">
                                                Active Tenure ≥ 3 Months (90 Days)
                                            </div>
                                            <p className="text-slate-600">
                                                Account age: {result.criteria.accountAgeDays} days ({result.criteria.tenureMonthsCompleted} months completed).
                                            </p>
                                        </div>
                                    </div>

                                    {/* CRITERION 3 */}
                                    <div
                                        className={`p-4 rounded-2xl border flex items-start gap-3 ${result.criteria.hasThreeApprovedMonths
                                                ? "bg-emerald-50/60 border-emerald-200"
                                                : "bg-rose-50/60 border-rose-200"
                                            }`}
                                    >
                                        {result.criteria.hasThreeApprovedMonths ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                        )}
                                        <div className="text-xs space-y-0.5">
                                            <div className="font-bold text-slate-900">
                                                ≥ 3 Approved Monthly Cycles
                                            </div>
                                            <p className="text-slate-600">
                                                Verified deposits across {result.criteria.approvedDepositMonthsCount} distinct month(s) ({result.criteria.approvedDepositCount} installments).
                                            </p>
                                        </div>
                                    </div>

                                    {/* CRITERION 4 */}
                                    <div
                                        className={`p-4 rounded-2xl border flex items-start gap-3 ${result.criteria.noDefaultedLoans && result.criteria.accountStatusValid
                                                ? "bg-emerald-50/60 border-emerald-200"
                                                : "bg-rose-50/60 border-rose-200"
                                            }`}
                                    >
                                        {result.criteria.noDefaultedLoans && result.criteria.accountStatusValid ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                        )}
                                        <div className="text-xs space-y-0.5">
                                            <div className="font-bold text-slate-900">
                                                Good Credit Standing &amp; Active Status
                                            </div>
                                            <p className="text-slate-600">
                                                Account is {result.account.status} with zero defaulted active personal loans.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : searched && !loading ? (
                <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                    No matching account found. Try searching with a valid account number.
                </div>
            ) : null}
        </section>
    );
}

