"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loan, Dues } from "@/types/fund";
import {
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Printer,
    RefreshCw,
    UserCheck,
    FileCheck
} from "lucide-react";

/* ================= TYPES ================= */

interface LoanSummary {
    mfLoanId: string;
    status: string;
    loanAmount: number;
    loanDate?: string;
    scheme: string;
    totalDues: number;
    paidDues: number;
    unpaidDues: number;
    totalPayable: number;
    totalCollected: number;
    remainingBalance: number;
    isNocEligible: boolean;
    closedAt?: number | string | Date;
    savingsRefunded?: boolean;
}

/* ================= PAGE ================= */

export default function CustomerNOCPage() {
    const [searchCode, setSearchCode] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [isSearching, startSearchTransition] = useTransition();

    // Results state
    const [matchedLoans, setMatchedLoans] = useState<Loan[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);

    // Compute loan closure date
    const getLoanClosureDate = (loan: Loan | null, summary: LoanSummary | null): string => {
        if (!loan) return "N/A";

        if ((loan).closedAt) {
            return new Date((loan).closedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }

        if (summary?.closedAt) {
            return new Date(summary.closedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }

        const paidDues = loan.dues?.filter((d) => d.paid && d.paidAt) || [];
        if (paidDues.length > 0) {
            const lastDue = paidDues[paidDues.length - 1];
            if (lastDue.paidAt) {
                return new Date(lastDue.paidAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                });
            }
        }

        if ((loan.status === "CLOSED" || loan.status === "REPAID") && (loan).updatedAt) {
            return new Date((loan).updatedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }

        return "Not Closed Yet";
    };

    /* ================= 1. SEARCH BY CUSTOMER CODE ONLY ================= */
    async function handleSearchByCode(e?: React.FormEvent) {
        if (e) e.preventDefault();
        const code = searchCode.trim();
        if (!code) {
            toast.warning("Please enter a customer code");
            return;
        }

        startSearchTransition(async () => {
            try {
                const res = await fetch(`/api/savings?customerCode=${encodeURIComponent(code)}`);
                const data = await res.json();

                if (!res.ok || !data.success) {
                    toast.error(data.message || "Customer not found");
                    return;
                }

                if (!data.lastLoan) {
                    toast.warning("Customer found, but has no recorded loans");
                    setSelectedLoan(null);
                    setLoanSummary(null);
                    setMatchedLoans([]);
                    return;
                }

                const fullLoan: Loan = {
                    ...data.lastLoan,
                    customer: data.client,
                    closedAt: data.savingsRecord?.approvedAt || data.lastLoan?.closedAt,
                };

                setSelectedLoan(fullLoan);
                setLoanSummary(data.lastLoanSummary || null);
                setMatchedLoans([fullLoan]);

                toast.success(`Loaded statement for ${data.client.name}`);
            } catch {
                toast.error("Failed to search customer by code");
            }
        });
    }

    /* ================= 2. SEARCH BY CLOSED DATE ONLY ================= */
    async function handleSearchByDate(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!filterDate) {
            toast.warning("Please select a date to search");
            return;
        }

        startSearchTransition(async () => {
            try {
                const res = await fetch(`/api/savings?date=${filterDate}`);
                const data = await res.json();

                if (!res.ok || !data.success) {
                    toast.error(data.message || "Failed to fetch closed records for this date");
                    return;
                }

                const list: Loan[] = data.loans || [];
                setMatchedLoans(list);

                if (list.length === 0) {
                    toast.info(`No closed customer loans found on ${filterDate}`);
                    setSelectedLoan(null);
                    setLoanSummary(null);
                    return;
                }

                // Select first customer loan by default
                handleSelectLoanFromList(list[0]);
                toast.success(`Found ${list.length} closed account(s) on ${filterDate}`);
            } catch {
                toast.error("Failed to search loans by date");
            }
        });
    }

    const handleSelectLoanFromList = (loan: Loan) => {
        setSelectedLoan(loan);

        const totalPaid = loan.dues?.filter((d) => d.paid).length || 0;
        const totalDues = loan.dues?.length || 0;
        const totalCollected = loan.dues?.reduce((acc, d) => acc + (d.paid ? d.total : 0), 0) || 0;
        const totalPayable = loan.dues?.reduce((acc, d) => acc + d.total, 0) || 0;

        setLoanSummary({
            mfLoanId: loan.mfLoanId,
            status: loan.status,
            loanAmount: loan.loanAmount,
            scheme: (loan.scheme)?.schemeName || "-",
            totalDues,
            paidDues: totalPaid,
            unpaidDues: totalDues - totalPaid,
            totalPayable,
            totalCollected,
            remainingBalance: Math.max(0, totalPayable - totalCollected),
            isNocEligible: loan.status === "CLOSED" || loan.status === "REPAID" || totalPaid === totalDues,
            closedAt: loan.closedAt,
            savingsRefunded: loan.savingsRefunded,
        });
    };

    const handleResetAll = () => {
        setSearchCode("");
        setFilterDate("");
        setSelectedLoan(null);
        setLoanSummary(null);
        setMatchedLoans([]);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 print:p-0 print:max-w-none print:m-0">
            {/* Header (Hidden on Print) */}
            <div className="print:hidden">
                <PageHeader />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5">
                            <FileCheck className="w-8 h-8 text-amber-500" />
                            Customer NOC / Loan Statement
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1">
                            Search individually by Customer Code or look up accounts closed on a specific date.
                        </p>
                    </div>

                    {selectedLoan && (
                        <Button
                            onClick={() => window.print()}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-sm rounded-xl px-5 h-10 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
                        >
                            <Printer className="w-4 h-4 text-amber-400" />
                            Print NOC
                        </Button>
                    )}
                </div>
            </div>

            {/* SELECTION CONTROLS (Hidden on Print) */}
            <div className="space-y-4 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Search by Customer Code */}
                    <Card className="p-5 rounded-2xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xs space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-amber-600" />
                            Option 1: Search By Customer Code
                        </label>
                        <form onSubmit={handleSearchByCode} className="flex gap-2">
                            <Input
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                placeholder="e.g. YPC-001 or CUST-1002"
                                className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm"
                            />
                            <Button
                                type="submit"
                                disabled={isSearching || !searchCode.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs rounded-xl h-10 px-4 transition-all cursor-pointer whitespace-nowrap"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : "Lookup Code"}
                            </Button>
                        </form>
                    </Card>

                    {/* Option 2: Search by Closed / Savings Return Date */}
                    <Card className="p-5 rounded-2xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xs space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            Option 2: Search By Closed Date
                        </label>
                        <form onSubmit={handleSearchByDate} className="flex gap-2">
                            <Input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm"
                            />
                            <Button
                                type="submit"
                                disabled={isSearching || !filterDate}
                                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs rounded-xl h-10 px-4 transition-all cursor-pointer whitespace-nowrap"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : "Find by Date"}
                            </Button>
                            {(searchCode || filterDate || selectedLoan) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResetAll}
                                    title="Reset All"
                                    className="rounded-xl border-slate-200 h-10 px-3 hover:bg-slate-100"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                </Button>
                            )}
                        </form>
                    </Card>
                </div>

                {/* Multiple Matches List (When Date returns multiple accounts) */}
                {matchedLoans.length > 1 && (
                    <Card className="p-4 rounded-2xl border border-amber-500/20 bg-white shadow-xs">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-amber-600" />
                            Accounts Closed On {filterDate} (Select to load statement):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {matchedLoans.map((l) => {
                                const isCurrent = selectedLoan?._id === l._id;
                                return (
                                    <button
                                        key={l._id}
                                        type="button"
                                        onClick={() => handleSelectLoanFromList(l)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${isCurrent
                                            ? "bg-slate-900 text-amber-400 border-amber-500/30 shadow-xs"
                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
                                            }`}
                                    >
                                        {l.customer?.name} ({l.customer?.customerCode || l.mfLoanId})
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* Real-Time Loan Summary Card */}
                {loanSummary && (
                    <Card className="p-4 rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-50/50 via-white to-slate-50 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm md:text-base font-bold text-slate-900">
                                    Account: <span className="text-blue-900 font-mono">{loanSummary.mfLoanId}</span>
                                </h3>
                                <p className="text-xs text-slate-600 mt-1">
                                    Scheme: <strong>{loanSummary.scheme}</strong> | Dues: <strong>{loanSummary.paidDues}/{loanSummary.totalDues}</strong> | Collected: <strong>₹{loanSummary.totalCollected.toLocaleString("en-IN")}</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {loanSummary.isNocEligible ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        NOC Clearance Ready
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        Balance Outstanding: ₹{loanSummary.remainingBalance.toLocaleString("en-IN")}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* ================= OFFICIAL PRINTABLE NOC STATEMENT ================= */}
            {selectedLoan && (
                <div className="space-y-6 bg-white p-6 md:p-10 border border-amber-500/20 rounded-2xl shadow-lg print:border-none print:shadow-none print:p-0">

                    {/* Official Letterhead Header (Displays on Print) */}
                    <div className="hidden print:flex border-b-2 border-slate-900 pb-4 mb-4 items-center justify-between gap-4">
                        <div className="relative w-24 h-16 shrink-0">
                            <Image
                                src="/default/logo.png"
                                alt="Company Logo"
                                fill
                                sizes="100px"
                                priority
                                className="object-contain"
                            />
                        </div>

                        <div className="text-right space-y-0.5 max-w-sm">
                            <h2 className="text-xs md:text-sm font-black tracking-tight text-slate-900 uppercase">
                                SAMPLE PRIME SMALL FINANCE PVT LTD
                            </h2>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                No. 112, PALAVATHANKATTALAI<br />
                                KARAIKAL MAIN ROAD KUMBAKONAM,<br />
                                THANJAVUR DISTRICT, PINCODE: 612401.
                            </p>
                        </div>
                    </div>

                    {/* Certificate Title */}
                    <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-slate-900">
                            NO OBJECTION CERTIFICATE (NOC)
                        </h2>
                        <p className="text-xs font-medium text-slate-500">
                            Loan Statement of Account & Clearance Confirmation
                        </p>
                    </div>

                    {/* Customer & Loan Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 border-b border-slate-100 text-xs">
                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Customer Name</p>
                            <p className="font-bold text-sm text-slate-900 mt-0.5">
                                {selectedLoan.customer?.name || "N/A"}
                            </p>
                            {selectedLoan.customer?.customerCode && (
                                <span className="inline-block mt-1 font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[10px]">
                                    {selectedLoan.customer.customerCode}
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Phone Number</p>
                            <p className="font-bold text-slate-800 mt-0.5">
                                {selectedLoan.phone || selectedLoan.customer?.phone || "N/A"}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Loan ID</p>
                            <p className="font-bold text-blue-900 font-mono mt-0.5">
                                {selectedLoan.mfLoanId}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Center / Branch</p>
                            <p className="font-bold text-slate-800 mt-0.5">
                                {selectedLoan.group?.groupName || "Main Center"}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Scheme Type</p>
                            <p className="font-bold text-slate-800 mt-0.5">
                                {selectedLoan.scheme?.schemeName || "Standard"}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Loan Sanction Amount</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                                ₹{selectedLoan.loanAmount?.toLocaleString("en-IN") || 0}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Account Status</p>
                            <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block mt-0.5 ${selectedLoan.status === "REPAID" || selectedLoan.status === "CLOSED"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                    }`}
                            >
                                {selectedLoan.status}
                            </span>
                        </div>

                        {/* Customer Closure Date */}
                        <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/50">
                            <p className="font-bold uppercase tracking-wider text-amber-900 text-[10px]">
                                Closed / Updated Date
                            </p>
                            <p className="font-black text-amber-800 mt-0.5">
                                {getLoanClosureDate(selectedLoan, loanSummary)}
                            </p>
                        </div>
                    </div>

                    {/* Dues Schedule Table */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Repayment Schedule & Realization Details
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse border border-slate-200">
                                <thead>
                                    <tr className="bg-slate-900 text-white border-b border-amber-500/30 print:bg-slate-100 print:text-slate-900">
                                        <th className="p-2 border border-slate-300 text-left font-bold">Due No</th>
                                        <th className="p-2 border border-slate-300 text-right font-bold">Principal (₹)</th>
                                        <th className="p-2 border border-slate-300 text-right font-bold">Interest (₹)</th>
                                        <th className="p-2 border border-slate-300 text-right font-bold">Savings (₹)</th>
                                        <th className="p-2 border border-slate-300 text-right font-bold">Total (₹)</th>
                                        <th className="p-2 border border-slate-300 text-center font-bold">Status</th>
                                        <th className="p-2 border border-slate-300 text-center font-bold">Paid Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedLoan.dues?.map((due: Dues, index: number) => (
                                        <tr key={index} className="hover:bg-amber-50/40 text-center">
                                            <td className="p-2 border border-slate-200 text-left font-semibold text-slate-800">
                                                {index + 1}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-right text-slate-700">
                                                ₹{due.principal?.toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-right text-slate-700">
                                                ₹{due.interest?.toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-right text-slate-700">
                                                ₹{due.savings?.toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">
                                                ₹{due.total?.toLocaleString("en-IN")}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center">
                                                {due.paid ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        PAID
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                        UNPAID
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">
                                                {due.paid && due.paidAt
                                                    ? new Date(due.paidAt).toLocaleDateString("en-IN")
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Legal Declaration */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                        This is to certify that the borrower mentioned above has fulfilled and repaid all obligations against loan account <strong>{selectedLoan.mfLoanId}</strong>. No dues or collateral liabilities remain outstanding on this specific credit facility as on the issuance date.
                    </div>

                    {/* Dual Signatures for Official Print */}
                    <div className="grid grid-cols-2 gap-8 pt-10 text-xs">
                        <div className="text-center space-y-1">
                            <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-800">
                                Branch Manager Signature
                            </div>
                            <p className="text-[10px] text-slate-500">Verified & Approved</p>
                        </div>
                        <div className="text-center space-y-1">
                            <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-800">
                                Customer Signature / Thumb
                            </div>
                            <p className="text-[10px] text-slate-500">Acknowledged & Received</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}