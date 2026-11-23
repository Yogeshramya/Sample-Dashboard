"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";

/* ================= TYPES ================= */

interface DueItem {
    weekNo?: number;
    savingsPaid?: number;
    savings?: number;
    paid: boolean;
}

interface LoanShape {
    _id: string;
    loanAmount?: number;
    status?: string;
    customer?: {
        _id?: string;
        name?: string;
        phone?: string;
    };
    dues?: DueItem[];
}

interface CustomerShape {
    _id: string;
    name?: string;
    phone?: string;
    customerCode?: string;
}

interface SavingsDraftEntry {
    amount: number;
    note?: string;
    date: string;
}

interface SavingsDraftShape {
    _id: string;
    customerId: string;
    totalSavings: number;
    entries?: SavingsDraftEntry[];
    refunded?: boolean;
}

interface SavingsApproval {
    status?: "PENDING" | "APPROVED" | null;
}

/* ================= PAGE ================= */

export default function SavingsRefundPage() {
    const params = useParams();
    const router = useRouter();
    const routeParamId = params?.id as string;

    const [resolvedCustomerId, setResolvedCustomerId] = useState<string>("");
    const [loan, setLoan] = useState<LoanShape | null>(null);
    const [customer, setCustomer] = useState<CustomerShape | null>(null);
    const [draft, setDraft] = useState<SavingsDraftShape | null>(null);
    const [approval, setApproval] = useState<SavingsApproval | null>(null);

    const [loanSavings, setLoanSavings] = useState(0);
    const [draftSavings, setDraftSavings] = useState(0);
    const [totalRefundAmount, setTotalRefundAmount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [addingSavings, setAddingSavings] = useState(false);
    const [requesting, setRequesting] = useState(false);

    const [savingsAmount, setSavingsAmount] = useState("");
    const [savingsNote, setSavingsNote] = useState("");

    const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

    /* ================= FETCH DATA ================= */

    const fetchData = useCallback(async () => {
        if (!routeParamId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/fund/customer?customerId=${routeParamId}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to load savings data");
                setLoan(null);
                setCustomer(null);
                return;
            }

            const activeLoan = data.loan || data.latestLoan || (data.loans && data.loans[0]) || null;
            setLoan(activeLoan);
            setCustomer(data.customer || activeLoan?.customer || null);
            setResolvedCustomerId(
                String(data.customerId || data.customer?._id || activeLoan?.customer?._id || routeParamId)
            );

            setDraft(data.draft || null);
            setLoanSavings(data.loanSavings || 0);
            setDraftSavings(data.draftSavings || 0);
            setTotalRefundAmount(data.totalSavings || 0);
            setApproval({ status: data.approvalStatus || null });
        } catch (err) {
            console.error("Fetch savings error:", err);
            toast.error("Failed to load savings data");
        } finally {
            setLoading(false);
        }
    }, [routeParamId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ================= ADD SAVINGS ================= */

    async function handleAddSavings() {
        const amount = Number(savingsAmount);

        if (!amount || amount <= 0) return toast.error("Enter valid savings amount");
        if (draft?.refunded || approval?.status === "APPROVED") return toast.error("Savings already finalized");

        const targetCustomerId = resolvedCustomerId || loan?.customer?._id || customer?._id || routeParamId;
        if (!targetCustomerId) return toast.error("Customer ID missing");

        setAddingSavings(true);

        try {
            const res = await fetch("/api/savingsdraft/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: targetCustomerId,
                    amount,
                    note: savingsNote,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data.error || "Failed to add savings");
                return;
            }

            setSavingsAmount("");
            setSavingsNote("");
            await fetchData();
            toast.success("Savings added successfully!");
        } catch {
            toast.error("Failed to add savings");
        } finally {
            setAddingSavings(false);
        }
    }

    /* ================= DELETE ENTRY ================= */

    async function handleDeleteEntry(entryIndex: number) {
        if (!draft) return;
        if (draft.refunded || approval?.status === "APPROVED") return toast.error("Savings already finalized");
        if (!confirm("Delete this savings entry?")) return;

        const targetCustomerId = resolvedCustomerId || loan?.customer?._id || customer?._id || routeParamId;
        if (!targetCustomerId) return toast.error("Customer ID missing");

        setDeletingIndex(entryIndex);

        try {
            const res = await fetch("/api/savingsdraft/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: targetCustomerId,
                    entryIndex,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data.error || "Delete failed");
                return;
            }

            await fetchData();
            toast.success("Entry deleted successfully!");
        } catch {
            toast.error("Delete failed");
        } finally {
            setDeletingIndex(null);
        }
    }

    /* ================= REQUEST SAVINGS RETURN ================= */

    async function handleRequestSavings() {
        if (!loan && !customer) return toast.error("Customer or Loan record not found");

        const isEligible = loan ? loan.status === "REPAID" || loan.status === "CLOSED" : true;
        if (!isEligible) {
            return toast.error("Savings return allowed only after loan is repaid or closed");
        }

        if (totalRefundAmount <= 0) return toast.error("No savings available to return");
        if (approval?.status === "PENDING") return toast.error("Request already pending approval");
        if (approval?.status === "APPROVED") return toast.error("Savings already paid");

        const targetCustomerId = resolvedCustomerId || loan?.customer?._id || customer?._id || routeParamId;
        if (!targetCustomerId) return toast.error("Customer ID missing");

        setRequesting(true);

        try {
            const res = await fetch("/api/savings/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: targetCustomerId,
                    savings: totalRefundAmount,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data.error || "Request failed");
                return;
            }

            toast.success("Savings return request sent for approval!");
            await fetchData();
        } catch {
            toast.error("Request failed");
        } finally {
            setRequesting(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Loading savings details...</p>
            </div>
        );
    }

    if (!loan && !customer) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <PageHeader />
                <Card className="p-8 text-center space-y-4 border-red-200 bg-red-50/40">
                    <h2 className="text-xl font-bold text-red-700">Record Not Found</h2>
                    <p className="text-sm text-slate-600">
                        Could not find any loan or customer associated with reference ID:{" "}
                        <span className="font-mono font-semibold">{routeParamId}</span>
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button variant="outline" onClick={() => router.push("/dashboard/fund/return")}>
                            Savings Return List
                        </Button>
                        <Button onClick={() => router.push("/dashboard/fund")}>
                            Back to Loans
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const customerName = customer?.name || loan?.customer?.name || "Customer";
    const customerPhone = customer?.phone || loan?.customer?.phone || "-";
    const loanStatus = loan?.status || "REPAID";
    const isLoanClosedOrRepaid = loanStatus === "REPAID" || loanStatus === "CLOSED";

    /* ================= UI ================= */

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
            <PageHeader />

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-xl border border-slate-200"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-700" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-green-700">
                        Savings Refund &amp; Return
                    </h1>
                    <p className="text-xs text-slate-500">
                        Review customer savings and initiate return disbursement after loan closure
                    </p>
                </div>
            </div>

            {/* Customer Info */}
            <Card className="p-5 space-y-2 border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-xs text-slate-400 block font-semibold uppercase">Customer</span>
                        <p className="font-bold text-slate-900">{customerName}</p>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block font-semibold uppercase">Phone</span>
                        <p className="font-medium text-slate-700">{customerPhone}</p>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block font-semibold uppercase">Loan Status</span>
                        <p className={`font-bold ${isLoanClosedOrRepaid ? "text-green-700" : "text-amber-600"}`}>
                            {loanStatus}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block font-semibold uppercase">Savings Status</span>
                        <p>
                            {approval?.status === "APPROVED" ? (
                                <span className="text-green-600 font-bold">Paid</span>
                            ) : approval?.status === "PENDING" ? (
                                <span className="text-yellow-600 font-bold">Requested (Pending Approval)</span>
                            ) : (
                                <span className="text-blue-600 font-bold">Available</span>
                            )}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Breakdown */}
            <Card className="p-6 space-y-3 border-slate-200 shadow-xs">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Loan Savings (from paid dues)</span>
                    <span className="font-mono font-semibold">₹{loanSavings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Draft Savings (manual entries)</span>
                    <span className="font-mono font-semibold">₹{draftSavings.toLocaleString()}</span>
                </div>
                <hr className="border-slate-100" />
                <div className="flex justify-between font-bold text-lg text-slate-900">
                    <span>Total Refund Amount</span>
                    <span className="text-green-700 font-mono">₹{totalRefundAmount.toLocaleString()}</span>
                </div>
            </Card>

            {/* Add Savings */}
            <Card className="p-6 space-y-4 border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Add Extra Savings Adjustment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                        <Input
                            placeholder="Savings Amount (₹)"
                            type="number"
                            value={savingsAmount}
                            onChange={(e) => setSavingsAmount(e.target.value)}
                            disabled={approval?.status === "APPROVED"}
                        />
                    </div>
                    <div className="sm:col-span-5">
                        <Input
                            placeholder="Note (optional)"
                            value={savingsNote}
                            onChange={(e) => setSavingsNote(e.target.value)}
                            disabled={approval?.status === "APPROVED"}
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <Button
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={handleAddSavings}
                            disabled={addingSavings || approval?.status === "APPROVED"}
                        >
                            {addingSavings ? "Adding..." : "Add Savings"}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Draft History */}
            <Card className="p-6 space-y-4 border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Savings Entries History
                </h3>
                {draft?.entries?.length ? (
                    draft.entries.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center border-b border-slate-100 pb-2 text-sm">
                            <div>
                                <p className="font-bold text-slate-900">
                                    ₹{entry.amount.toLocaleString()}{" "}
                                    <span className="text-xs text-slate-500 font-normal">
                                        &bull; {new Date(entry.date).toLocaleDateString()}
                                    </span>
                                </p>
                                {entry.note && (
                                    <p className="text-xs text-slate-500">{entry.note}</p>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={approval?.status === "APPROVED" || deletingIndex === index}
                                onClick={() => handleDeleteEntry(index)}
                            >
                                Delete
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-slate-400">No manual draft entries added</p>
                )}
            </Card>

            {/* Request Savings */}
            <Card className="p-6 border-slate-200 shadow-xs">
                <Button
                    className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
                    disabled={
                        requesting ||
                        totalRefundAmount <= 0 ||
                        !isLoanClosedOrRepaid ||
                        approval?.status === "PENDING" ||
                        approval?.status === "APPROVED"
                    }
                    onClick={handleRequestSavings}
                >
                    {approval?.status === "APPROVED"
                        ? "Savings Paid"
                        : approval?.status === "PENDING"
                            ? "Request Pending Approval"
                            : requesting
                                ? "Sending Request..."
                                : `Request Savings Return ₹${totalRefundAmount.toLocaleString()}`}
                </Button>
                {!isLoanClosedOrRepaid && (
                    <p className="text-xs text-rose-500 text-center mt-2">
                        * Loan status must be REPAID or CLOSED before savings can be refunded.
                    </p>
                )}
            </Card>
        </div>
    );
}
