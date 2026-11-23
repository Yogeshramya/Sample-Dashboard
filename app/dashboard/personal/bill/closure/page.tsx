"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoanNav from "@/components/PersonalLoans/LoanNav";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Lock,
    Printer,
    CheckCircle2,
    Calculator,
    Award,
    AlertCircle,
    User,
    FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { IPersonalLoanDocument } from "@/types/personal-loan";

export default function LoanClosurePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<IPersonalLoanDocument[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<IPersonalLoanDocument | null>(null);

    // Closure Form State
    const [closureType, setClosureType] = useState<"NORMAL" | "PRECLOSURE">("NORMAL");
    const [settlementAmount, setSettlementAmount] = useState<string>("0");
    const [interestDiscount, setInterestDiscount] = useState<string>("0");
    const [penaltyWaived, setPenaltyWaived] = useState<string>("0");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "UPI">("CASH");
    const [closureRemarks, setClosureRemarks] = useState<string>("");
    const [closedNocLoan, setClosedNocLoan] = useState<IPersonalLoanDocument | null>(null);

    const loadActiveLoans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/personal/loans?status=ACTIVE,OVERDUE");
            const data = await res.json();
            if (data.success) {
                setLoans(data.loans || []);
            }
        } catch {
            toast.error("Failed to load active loans");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActiveLoans();
    }, [loadActiveLoans]);

    const handleSelectLoan = (ln: IPersonalLoanDocument) => {
        setSelectedLoan(ln);
        setClosedNocLoan(null);
        // Default settlement amount equals remaining principal outstanding
        setSettlementAmount(String(ln.totalOutstanding || 0));
        setInterestDiscount("0");
        setPenaltyWaived("0");
        setClosureType(ln.totalOutstanding <= 0 ? "NORMAL" : "PRECLOSURE");
        setClosureRemarks("Customer settled all dues in full. Account closed with NOC.");
    };

    const handleCloseLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        if (
            !confirm(
                `Confirm ${closureType} closure for loan ${selectedLoan.loanId}? This will generate a formal NOC certificate.`
            )
        ) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/loans/${selectedLoan._id}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    closureType,
                    settlementAmount: Number(settlementAmount) || 0,
                    interestDiscount: Number(interestDiscount) || 0,
                    penaltyWaived: Number(penaltyWaived) || 0,
                    paymentMethod,
                    closureRemarks,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Personal loan ${closureType.toLowerCase()} closed successfully! NOC generated.`);
                setClosedNocLoan(data.loan);
                setSelectedLoan(null);
                loadActiveLoans();
            } else {
                toast.error(data.error || "Closure execution failed");
            }
        } catch {
            toast.error("Network error during closure");
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
            <div className="print:hidden">
                <PageHeader />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-4 print:hidden">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Personal Loan Closure &amp; NOC Certification
                    </h1>
                    <p className="text-xs text-slate-500">
                        Process normal maturity closures, early pre-closures with waivers, and issue No Objection Certificates
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ACTIVE LOANS LIST */}
                <div className="lg:col-span-2 space-y-4 print:hidden">
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Select Running Loan Account to Settle ({loans.length})
                            </h2>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3 text-left">Loan ID</th>
                                            <th className="p-3 text-left">Borrower</th>
                                            <th className="p-3 text-right">Principal Sanctioned</th>
                                            <th className="p-3 text-right">Repaid</th>
                                            <th className="p-3 text-right">Total Outstanding</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No running loans available for settlement.
                                                </td>
                                            </tr>
                                        ) : (
                                            loans.map((ln) => {
                                                const cust = typeof ln.customer === "object" ? ln.customer : null;
                                                const isSelected = selectedLoan?._id === ln._id;

                                                return (
                                                    <tr
                                                        key={ln._id}
                                                        className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-purple-50/60" : ""
                                                            }`}
                                                    >
                                                        <td className="p-3 font-mono font-bold text-slate-900">
                                                            {ln.loanId}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-bold text-slate-900">{cust?.fullName || "—"}</div>
                                                            <div className="text-[10px] text-slate-500">{cust?.mobile}</div>
                                                        </td>
                                                        <td className="p-3 text-right font-medium text-slate-700">
                                                            {formatCurrency(ln.loanAmount)}
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-emerald-700">
                                                            {formatCurrency(ln.totalPrincipalRepaid)}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-rose-700">
                                                            {formatCurrency(ln.totalOutstanding)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 text-[11px] rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-black cursor-pointer shadow-xs"
                                                                onClick={() => handleSelectLoan(ln)}
                                                            >
                                                                Settle / Close
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
                </div>

                {/* CLOSURE WORKBENCH / NOC CERTIFICATE */}
                <div>
                    {closedNocLoan ? (
                        <Card className="rounded-3xl border-2 border-emerald-500 shadow-md bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="text-center pb-3 border-b border-slate-100">
                                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-2">
                                        <Award className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        NO OBJECTION CERTIFICATE (NOC)
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono">
                                        Loan ID: {closedNocLoan.loanId}
                                    </p>
                                    <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                        STATUS: {closedNocLoan.status}
                                    </span>
                                </div>

                                <div className="text-xs text-slate-700 space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                                    <p>
                                        This is to certify that{" "}
                                        <strong>
                                            {typeof closedNocLoan.customer === "object"
                                                ? closedNocLoan.customer.fullName
                                                : "Customer"}
                                        </strong>{" "}
                                        has settled all dues against Personal Loan <strong>{closedNocLoan.loanId}</strong> in full.
                                    </p>
                                    <p className="text-slate-500 text-[11px]">
                                        Closure Date: {closedNocLoan.closedAt ? new Date(closedNocLoan.closedAt).toLocaleDateString("en-IN") : "N/A"}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        onClick={() => window.print()}
                                        className="w-full bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] font-bold rounded-xl text-xs h-10 cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4 mr-1.5" />
                                        Print Formal NOC Certificate
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setClosedNocLoan(null);
                                            setSelectedLoan(null);
                                        }}
                                        className="w-full rounded-xl text-xs h-9 cursor-pointer"
                                    >
                                        Done
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : selectedLoan ? (
                        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-6">
                            <CardContent className="p-5 md:p-6 space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        Settlement Calculator
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                        {selectedLoan.loanId} —{" "}
                                        {typeof selectedLoan.customer === "object"
                                            ? selectedLoan.customer.fullName
                                            : ""}
                                    </div>
                                </div>

                                <form onSubmit={handleCloseLoan} className="space-y-3 text-xs">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Closure Type</label>
                                        <select
                                            value={closureType}
                                            onChange={(e) => setClosureType(e.target.value as "NORMAL" | "PRECLOSURE")}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-purple-600 bg-white"
                                        >
                                            <option value="NORMAL">Normal Maturity Completion</option>
                                            <option value="PRECLOSURE">Early Pre-closure (Settlement)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-bold text-slate-800">
                                            Final Settlement Amount to Collect (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            value={settlementAmount}
                                            onChange={(e) => setSettlementAmount(e.target.value)}
                                            className="h-10 rounded-xl font-black text-purple-950 bg-purple-50/40 border-purple-300"
                                            required
                                        />
                                    </div>

                                    {closureType === "PRECLOSURE" && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-slate-600 font-semibold">
                                                    Interest Rebate (₹)
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={interestDiscount}
                                                    onChange={(e) => setInterestDiscount(e.target.value)}
                                                    className="rounded-xl text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-slate-600 font-semibold">
                                                    Penalty Waived (₹)
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={penaltyWaived}
                                                    onChange={(e) => setPenaltyWaived(e.target.value)}
                                                    className="rounded-xl text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Settlement Payment Mode</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) =>
                                                setPaymentMethod(e.target.value as "CASH" | "BANK_TRANSFER" | "UPI")
                                            }
                                            className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-purple-600 bg-white"
                                        >
                                            <option value="CASH">Cash (Credits Branch Daysheet)</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-slate-700">Closure Remarks</label>
                                        <Input
                                            type="text"
                                            value={closureRemarks}
                                            onChange={(e) => setClosureRemarks(e.target.value)}
                                            className="rounded-xl text-xs"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl text-xs h-11 cursor-pointer shadow-md"
                                    >
                                        <Lock className="w-4 h-4 mr-1.5" />
                                        Execute Closure &amp; Issue NOC
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Select a loan from the table to process settlement and issue NOC.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

