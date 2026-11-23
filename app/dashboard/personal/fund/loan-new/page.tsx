"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Coins,
    CheckCircle2,
    XCircle,
    User,
    Shield,
    Calculator,
    ArrowLeft,
    Send,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PersonalLoanEligibilityResponse } from "@/types/personal-loan";
import { generateAmortizationDues } from "@/lib/personal-loan-calc";

interface AccountOption {
    accountNumber: string;
    accountId: string;
    customer: {
        _id: string;
        fullName: string;
        mobile: string;
        clientId: string;
        address?: string;
        guarantorName?: string;
        guarantorMobile?: string;
        guarantorRelation?: string;
    };
    scheme: {
        schemeName: string;
        frequency: string;
        installmentAmount: number;
    };
    eligibility: PersonalLoanEligibilityResponse;
}

export default function NewLoanApplicationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [eligibilityData, setEligibilityData] = useState<PersonalLoanEligibilityResponse | null>(null);

    // Form inputs (Manual loan amount entry)
    const [loanAmount, setLoanAmount] = useState<string>("50000");
    const [interestRatePercent, setInterestRatePercent] = useState<string>("12");
    const [interestType, setInterestType] = useState<"FLAT" | "REDUCING">("FLAT");
    const [repaymentFrequency, setRepaymentFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
    const [tenureUnits, setTenureUnits] = useState<string>("100");
    const [processingFee, setProcessingFee] = useState<string>("500");
    const [documentationCharges, setDocumentationCharges] = useState<string>("200");
    const [purpose, setPurpose] = useState<string>("Business expansion");

    // Guarantor
    const [guarantorName, setGuarantorName] = useState("");
    const [guarantorMobile, setGuarantorMobile] = useState("");
    const [guarantorRelation, setGuarantorRelation] = useState("");
    const [guarantorAddress, setGuarantorAddress] = useState("");

    // Load available accounts
    useEffect(() => {
        async function fetchAccounts() {
            setLoading(true);
            try {
                const res = await fetch("/api/personal/loans/eligibility");
                const data = await res.json();
                if (data.success && data.accounts) {
                    setAccounts(data.accounts);
                }
            } catch {
                toast.error("Failed to load savings accounts");
            } finally {
                setLoading(false);
            }
        }
        fetchAccounts();
    }, []);

    const handleSelectAccount = (accId: string) => {
        setSelectedAccountId(accId);
        const acc = accounts.find((a) => a.accountId === accId);
        if (acc) {
            setEligibilityData(acc.eligibility);
            setGuarantorName(acc.customer.guarantorName || "");
            setGuarantorMobile(acc.customer.guarantorMobile || "");
            setGuarantorRelation(acc.customer.guarantorRelation || "Family");
            setGuarantorAddress(acc.customer.address || "");
            if (acc.scheme.frequency === "DAILY") {
                setRepaymentFrequency("DAILY");
                setTenureUnits("100");
            } else if (acc.scheme.frequency === "WEEKLY") {
                setRepaymentFrequency("WEEKLY");
                setTenureUnits("25");
            } else {
                setRepaymentFrequency("MONTHLY");
                setTenureUnits("12");
            }
        } else {
            setEligibilityData(null);
        }
    };

    // Live Amortization Schedule Calculation
    const schedulePreview = useMemo(() => {
        const amt = Number(loanAmount) || 0;
        const rate = Number(interestRatePercent) || 0;
        const tenure = Number(tenureUnits) || 1;
        if (amt <= 0 || tenure <= 0) return null;

        return generateAmortizationDues(amt, rate, interestType, repaymentFrequency, tenure, new Date());
    }, [loanAmount, interestRatePercent, interestType, repaymentFrequency, tenureUnits]);

    const handleSubmitApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccountId) {
            return toast.error("Please select a customer savings account");
        }
        const amt = Number(loanAmount);
        if (!amt || amt <= 0) {
            return toast.error("Please enter a valid loan amount");
        }
        if (!guarantorName.trim() || !guarantorMobile.trim()) {
            return toast.error("Guarantor name and mobile are required");
        }

        setLoading(true);
        try {
            const payload = {
                personalAccountId: selectedAccountId,
                loanAmount: amt,
                interestRatePercent: Number(interestRatePercent),
                interestType,
                repaymentFrequency,
                tenureUnits: Number(tenureUnits),
                processingFee: Number(processingFee),
                documentationCharges: Number(documentationCharges),
                purpose,
                guarantorName,
                guarantorMobile,
                guarantorRelation,
                guarantorAddress,
                allowIneligibleOverride: false,
            };

            const res = await fetch("/api/personal/loans/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Personal loan application submitted successfully!");
                router.push("/dashboard/personal/loans");
            } else {
                toast.error(data.error || "Failed to submit application");
            }
        } catch {
            toast.error("Network error submitting application");
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

            <div className="flex items-center justify-between border-b border-emerald-950/10 pb-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            New Personal Loan Application
                        </h1>
                        <p className="text-xs text-slate-500">
                            Apply for a personal loan linked to an eligible savings account (≥ ₹3,000/mo deposit for 3+ months)
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT & CENTER: APPLICATION FORM */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ACCOUNT SELECTION & ELIGIBILITY STATUS */}
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <User className="w-4 h-4 text-emerald-700" />
                                1. Select Customer Savings Account
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">
                                    Savings Account Number & Customer Name
                                </Label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => handleSelectAccount(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                                    required
                                >
                                    <option value="">-- Choose active savings account --</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.accountId} value={acc.accountId}>
                                            {acc.accountNumber} — {acc.customer?.fullName} ({acc.customer?.mobile}) | Scheme: {acc.scheme?.schemeName} (₹{acc.scheme?.installmentAmount}/{acc.scheme?.frequency}) {acc.eligibility?.isEligible ? "✓ Eligible" : "✗ Ineligible"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ELIGIBILITY AUDIT BANNER */}
                            {eligibilityData && (
                                <div
                                    className={`p-4 rounded-2xl border ${eligibilityData.isEligible
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                        : "bg-rose-50 border-rose-300 text-rose-950"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {eligibilityData.isEligible ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="space-y-1 text-xs">
                                            <div className="font-bold text-sm">
                                                {eligibilityData.isEligible
                                                    ? "Customer is Eligible for Personal Loan"
                                                    : "Customer is Currently Ineligible"}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                                                <div>
                                                    <span className="text-slate-500">Monthly Contribution:</span>
                                                    <div className="font-bold">
                                                        ₹{eligibilityData.criteria.monthlyContribution.toLocaleString("en-IN")}/mo
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Account Age:</span>
                                                    <div className="font-bold">
                                                        {eligibilityData.criteria.accountAgeDays} days ({eligibilityData.criteria.tenureMonthsCompleted} mo)
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Approved Cycles:</span>
                                                    <div className="font-bold">
                                                        {eligibilityData.criteria.approvedDepositMonthsCount} distinct months
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Total Deposited:</span>
                                                    <div className="font-bold">
                                                        ₹{eligibilityData.account.totalDeposited.toLocaleString("en-IN")}
                                                    </div>
                                                </div>
                                            </div>
                                            {eligibilityData.reasons.map((r, i) => (
                                                <p key={i} className="text-[11px] font-medium opacity-90">
                                                    • {r}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* FINANCIAL TERMS (MANUAL LOAN AMOUNT INPUT) */}
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <Coins className="w-4 h-4 text-[#d97706]" />
                                2. Loan Sanction Terms (Manual Amount Entry)
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-bold text-slate-800">
                                        Sanctioned Loan Amount (₹) <span className="text-rose-500">* (Manually Entered)</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        value={loanAmount}
                                        onChange={(e) => setLoanAmount(e.target.value)}
                                        className="h-11 rounded-xl text-base font-black text-emerald-950 border-emerald-300 focus:border-emerald-600 bg-emerald-50/30"
                                        placeholder="e.g. 50000"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-500">
                                        Enter the approved personal loan principal manually based on credit assessment.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Repayment Frequency</Label>
                                    <select
                                        value={repaymentFrequency}
                                        onChange={(e) => {
                                            const f = e.target.value as "DAILY" | "WEEKLY" | "MONTHLY";
                                            setRepaymentFrequency(f);
                                            if (f === "DAILY") setTenureUnits("100");
                                            else if (f === "WEEKLY") setTenureUnits("25");
                                            else setTenureUnits("12");
                                        }}
                                        className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="DAILY">Daily Installments</option>
                                        <option value="WEEKLY">Weekly Installments</option>
                                        <option value="MONTHLY">Monthly Installments (EMI)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Tenure ({repaymentFrequency === "DAILY" ? "Days" : repaymentFrequency === "WEEKLY" ? "Weeks" : "Months"})
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={tenureUnits}
                                        onChange={(e) => setTenureUnits(e.target.value)}
                                        className="rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Annual Interest Rate (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={interestRatePercent}
                                        onChange={(e) => setInterestRatePercent(e.target.value)}
                                        className="rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Interest Calculation Mode</Label>
                                    <select
                                        value={interestType}
                                        onChange={(e) => setInterestType(e.target.value as "FLAT" | "REDUCING")}
                                        className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="FLAT">Flat Interest Rate</option>
                                        <option value="REDUCING">Reducing Balance (Standard EMI)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Processing Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        value={processingFee}
                                        onChange={(e) => setProcessingFee(e.target.value)}
                                        className="rounded-xl text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Documentation Charges (₹)</Label>
                                    <Input
                                        type="number"
                                        value={documentationCharges}
                                        onChange={(e) => setDocumentationCharges(e.target.value)}
                                        className="rounded-xl text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-semibold text-slate-700">Loan Purpose / Remarks</Label>
                                    <Input
                                        type="text"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        placeholder="e.g. Business Working Capital, Emergency, Home repair"
                                        className="rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* GUARANTOR DETAILS */}
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <Shield className="w-4 h-4 text-blue-700" />
                                3. Guarantor Verification Information
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Guarantor Name</Label>
                                    <Input
                                        type="text"
                                        value={guarantorName}
                                        onChange={(e) => setGuarantorName(e.target.value)}
                                        className="rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Guarantor Mobile</Label>
                                    <Input
                                        type="text"
                                        value={guarantorMobile}
                                        onChange={(e) => setGuarantorMobile(e.target.value)}
                                        className="rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Relation to Customer</Label>
                                    <Input
                                        type="text"
                                        value={guarantorRelation}
                                        onChange={(e) => setGuarantorRelation(e.target.value)}
                                        className="rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Guarantor Address</Label>
                                    <Input
                                        type="text"
                                        value={guarantorAddress}
                                        onChange={(e) => setGuarantorAddress(e.target.value)}
                                        className="rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: LIVE LOAN BREAKUP & SUBMISSION */}
                <div className="space-y-6">
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-gradient-to-b from-[#241E4E] to-[#15122B] text-emerald-50 overflow-hidden sticky top-6">
                        <CardContent className="p-5 md:p-6 space-y-5">
                            <div className="flex items-center gap-2 text-sm font-black text-[#7C5CFC]">
                                <Calculator className="w-4 h-4" />
                                Live Loan Repayment Breakdown
                            </div>

                            {schedulePreview ? (
                                <div className="space-y-3 text-xs">
                                    <div className="p-4 rounded-2xl bg-[#2F2864] border border-[#7C5CFC]/30 space-y-2">
                                        <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                                            Installment Amount ({repaymentFrequency})
                                        </div>
                                        <div className="text-2xl md:text-3xl font-black text-[#7C5CFC]">
                                            {formatCurrency(schedulePreview.installmentAmount)}
                                        </div>
                                        <div className="text-[11px] text-emerald-200/90">
                                            Payable every {repaymentFrequency.toLowerCase()} for {tenureUnits}{" "}
                                            {repaymentFrequency === "DAILY" ? "days" : repaymentFrequency === "WEEKLY" ? "weeks" : "months"}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-emerald-800/60">
                                        <div className="flex justify-between">
                                            <span className="text-emerald-300/80">Sanctioned Principal:</span>
                                            <span className="font-bold text-white">{formatCurrency(Number(loanAmount) || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-300/80">Total Interest Payable:</span>
                                            <span className="font-bold text-[#7C5CFC]">{formatCurrency(schedulePreview.totalInterest)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-300/80">Total Payable Dues:</span>
                                            <span className="font-bold text-white">{formatCurrency(schedulePreview.totalPayable)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span>Processing + Doc Fee:</span>
                                            <span>{formatCurrency((Number(processingFee) || 0) + (Number(documentationCharges) || 0))}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-emerald-400 pt-2 border-t border-emerald-800/40">
                                            <span>Net Cash Payout:</span>
                                            <span>
                                                {formatCurrency(
                                                    Math.max(
                                                        0,
                                                        (Number(loanAmount) || 0) -
                                                        ((Number(processingFee) || 0) + (Number(documentationCharges) || 0))
                                                    )
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-emerald-300/70">
                                    Enter loan amount and tenure to calculate repayment schedule.
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={!selectedAccountId || !eligibilityData?.isEligible}
                                className="w-full bg-[#7C5CFC] hover:bg-[#d97706] text-slate-950 font-black rounded-xl h-11 text-xs uppercase tracking-wide cursor-pointer shadow-md disabled:opacity-50"
                            >
                                <Send className="w-4 h-4 mr-1.5" />
                                Submit Loan Application
                            </Button>

                            {!eligibilityData?.isEligible && selectedAccountId && (
                                <p className="text-[11px] text-rose-300 text-center font-medium">
                                    ⚠️ Customer must meet 3-month ₹3,000+ scheme criteria to apply.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </form>
        </section>
    );
}

