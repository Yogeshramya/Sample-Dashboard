"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { CashDenomination, DaySheetReport } from "@/types/daysheet";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, UserCheck, Clock, Printer, PiggyBank, Sparkles } from "lucide-react";
import { getTodayIST } from "@/lib/ist";

type DenomKey =
    | "500"
    | "200"
    | "100"
    | "50"
    | "20"
    | "10"
    | "5"
    | "2"
    | "1";

interface CustomUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    branch?: {
        _id: string;
        name: string;
    } | null;
    activeBranch?: {
        _id: string;
        name: string;
    } | null;
}

type ExtendedDaySheetReport = DaySheetReport & {
    closedBy?: { name: string } | string;
    employee?: { name: string };
    closedAt?: string | Date;
    updatedAt?: string | Date;
    cashBox?: {
        employee?: { name: string } | string;
        updatedAt?: string;
        date?: string;
    };
    previousDaySheetPending?: boolean;
    previousDaySheetDate?: string | Date;
    previousDaySheetStatus?: string;
};

function SavingsDaySheetContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ExtendedDaySheetReport | null>(null);
    const isTeller = session?.user?.role === "TELLER";
    const isAdmin = session?.user?.role === "ADMINISTRATOR" || session?.user?.role === "ACCOUNTS_HEAD";
    const todayIST = getTodayIST();

    // DATE STATE DEFAULT TODAY (IST)
    const selectedDate = isTeller
        ? todayIST
        : searchParams.get("date") || todayIST;

    const isCurrentDate = selectedDate === todayIST;
    const isPreviousDayPending = Boolean(report?.previousDaySheetPending);
    const canSaveAndClose = (isCurrentDate || isAdmin) && !isPreviousDayPending;

    const [cashDenom, setCashDenom] = useState<CashDenomination>({
        "500": 0,
        "200": 0,
        "100": 0,
        "50": 0,
        "20": 0,
        "10": 0,
        "5": 0,
        "2": 0,
        "1": 0,
    });

    const denomKeys: DenomKey[] = ["500", "200", "100", "50", "20", "10", "5", "2", "1"];

    const cashBoxStatus = report?.cashBoxStatus || null;
    const isApproved = cashBoxStatus === "APPROVED";
    const isPending = cashBoxStatus === "PENDING";
    const isRejected = cashBoxStatus === "REJECTED";

    const denomTotal = denomKeys.reduce(
        (sum, k) => sum + cashDenom[k] * Number(k),
        0
    );

    const updateDenom = (key: DenomKey, value: string) => {
        setCashDenom((prev) => ({
            ...prev,
            [key]: Math.max(0, Number(value)),
        }));
    };

    const format = (v: number) => Number(v || 0).toFixed(2);

    /* ---------------- DATE CONTROLS ---------------- */

    const changeDate = (days: number) => {
        if (isTeller) return;
        const [y, m, day] = selectedDate.split("-").map(Number);
        const d = new Date(y, m - 1, day + days);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, "0");
        const dStr = String(d.getDate()).padStart(2, "0");
        const newDate = `${yStr}-${mStr}-${dStr}`;

        router.push(`/dashboard/personal/report/day-sheet?date=${newDate}`, { scroll: false });
    };

    const resetToday = () => {
        if (isTeller) return;
        router.push(`/dashboard/personal/report/day-sheet?date=${todayIST}`);
    };

    /* ---------------- LOAD DAY SHEET ---------------- */

    const loadSheetData = useCallback(async (date: string) => {
        setLoading(true);

        try {
            const uBranch =
                (session?.user as CustomUser)?.activeBranch ||
                (session?.user as CustomUser)?.branch;
            const branchParam = uBranch?._id ? `&branchId=${uBranch._id}` : "";

            const sheetRes = await fetch(
                `/api/personal/reports/day-sheet?from=${date}&to=${date}&type=TRUE${branchParam}`
            );

            const sheetJson = await sheetRes.json();

            if (!sheetJson.success) {
                toast.error(sheetJson.error || "No savings day sheet found");
                setReport(null);
                setCashDenom({
                    "500": 0,
                    "200": 0,
                    "100": 0,
                    "50": 0,
                    "20": 0,
                    "10": 0,
                    "5": 0,
                    "2": 0,
                    "1": 0,
                });
                return;
            }

            setReport(sheetJson.report);

            // If API gives denomination already (approved/saved cashbox or draft)
            if (sheetJson.report?.denomination?.length > 0) {
                const denom: CashDenomination = {
                    "500": 0,
                    "200": 0,
                    "100": 0,
                    "50": 0,
                    "20": 0,
                    "10": 0,
                    "5": 0,
                    "2": 0,
                    "1": 0,
                };

                sheetJson.report.denomination.forEach(
                    (d: { note: number; count: number }) => {
                        const key = String(d.note) as DenomKey;
                        if (key in denom) denom[key] = d.count;
                    }
                );

                setCashDenom(denom);
            } else {
                setCashDenom({
                    "500": 0,
                    "200": 0,
                    "100": 0,
                    "50": 0,
                    "20": 0,
                    "10": 0,
                    "5": 0,
                    "2": 0,
                    "1": 0,
                });
            }
        } catch {
            toast.error("Failed to load savings day sheet");
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        let isMounted = true;

        const executeLoadSheet = async () => {
            if (isMounted) {
                await loadSheetData(selectedDate);
            }
        };

        executeLoadSheet();

        return () => {
            isMounted = false;
        };
    }, [selectedDate, loadSheetData]);

    /* ---------------- ACTIONS ---------------- */

    const handleSaveTemp = async () => {
        if (!report || isApproved || isPending) return;

        if (!canSaveAndClose) {
            toast.error("Day sheet draft can only be saved on the current date. Only administrators can edit previous days.");
            return;
        }

        const payload = {
            date: selectedDate,
            branchId: userBranch?._id,
            denomination: denomKeys.map((k) => ({
                note: Number(k),
                count: cashDenom[k],
                total: cashDenom[k] * Number(k),
            })),
        };

        try {
            const res = await fetch("/api/personal/reports/day-sheet/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Draft saved successfully");
                await loadSheetData(selectedDate);
            } else {
                toast.error(json.error || "Save failed");
            }
        } catch {
            toast.error("Save failed");
        }
    };

    const handleCloseDay = async () => {
        if (!report) return;

        if (isPreviousDayPending) {
            toast.error("Cannot close day sheet: The previous day sheet has not been approved by the Administrator yet.");
            return;
        }

        if (!canSaveAndClose) {
            toast.error("Day sheet can only be closed on the current date. Only administrators can close previous days.");
            return;
        }

        if (denomTotal !== report.closingBalance) {
            return toast.error("Denomination mismatch!");
        }

        if (!confirm("Once sent for approval, this cannot be edited. Continue?")) {
            return;
        }

        const payload = {
            date: selectedDate,
            branchId: userBranch?._id,
            openingBalance: report.openingBalance,
            closingBalance: report.closingBalance,
            denomination: denomKeys.map((k) => ({
                note: Number(k),
                count: cashDenom[k],
                total: cashDenom[k] * Number(k),
            })),
        };

        try {
            const res = await fetch("/api/personal/reports/day-sheet/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Day closed and sent for approval successfully");
                await loadSheetData(selectedDate);
            } else {
                toast.error(json.error || "Close failed");
            }
        } catch {
            toast.error("Close failed");
        }
    };

    const totalIncome =
        report?.income?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    const totalExpense =
        report?.expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;

    const userBranch =
        (session?.user as CustomUser)?.activeBranch ||
        (session?.user as CustomUser)?.branch;

    // Resolve employee who closed / saved
    const closedByName =
        typeof report?.closedBy === "object" && report?.closedBy !== null
            ? (report.closedBy as { name: string }).name
            : typeof report?.closedBy === "string"
                ? report.closedBy
                : typeof report?.cashBox?.employee === "object"
                    ? (report.cashBox.employee as { name: string }).name
                    : (report?.cashBox?.employee as string) || (report)?.employee?.name || null;

    // Resolve closure timestamp
    const closedDateVal =
        report?.closedAt ||
        report?.cashBox?.updatedAt ||
        report?.cashBox?.date ||
        report?.updatedAt ||
        null;

    /* ---------------- RENDER ---------------- */

    return (
        <form className="p-4 md:p-6 w-full max-w-full mx-auto space-y-6 print-area">
            <LoadingOverlay show={loading} />

            <div className="flex items-center justify-between mb-4 no-print">
                <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    onClick={() => router.push("/dashboard/personal/report")}
                    type="button"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Savings Reports
                </button>

                <Button
                    variant="outline"
                    className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] font-bold text-xs"
                    onClick={() => window.print()}
                    type="button"
                >
                    <Printer className="h-4 w-4 text-[#7C5CFC]" />
                    Print Statement
                </Button>
            </div>

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#1C173D] text-[#7C5CFC] border border-[#7C5CFC]/30 shadow-md">
                        <PiggyBank className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-[10px] font-bold uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-[#7C5CFC]" />
                            Smart Savings
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            Smart Savings Day Accounts Summary
                        </h1>
                    </div>
                </div>
            </div>

            {/* DATE NAVIGATION */}
            <div className="flex justify-center items-center gap-3 no-print">
                {isTeller ? (
                    <div className="text-sm font-medium text-slate-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                        Report date: Today (IST) — {selectedDate}
                    </div>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => changeDate(-1)}
                            type="button"
                            className="rounded-xl cursor-pointer"
                        >
                            ⬅
                        </Button>

                        <p className="font-semibold text-slate-800 px-3 py-1 bg-slate-100 rounded-xl">
                            {selectedDate}
                        </p>

                        <Button
                            variant="outline"
                            onClick={() => changeDate(1)}
                            type="button"
                            className="rounded-xl cursor-pointer"
                        >
                            ➡
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={resetToday}
                            type="button"
                            className="rounded-xl cursor-pointer font-bold"
                        >
                            Today
                        </Button>
                    </>
                )}
            </div>

            {userBranch && (
                <p className="text-center text-sm text-slate-600 font-medium">
                    Branch: {userBranch.name}
                </p>
            )}

            {cashBoxStatus && (
                <p className="text-center font-semibold text-sm">
                    Status:{" "}
                    <span
                        className={
                            isApproved
                                ? "text-emerald-600"
                                : isPending
                                    ? "text-amber-600"
                                    : isRejected
                                        ? "text-rose-600"
                                        : "text-slate-500"
                        }
                    >
                        {cashBoxStatus}
                    </span>
                </p>
            )}

            {!report ? (
                <p className="text-center text-slate-400 py-10">
                    No savings day sheet available
                </p>
            ) : (
                <>
                    {/* APPROVAL LOCK BANNERS */}
                    {isPreviousDayPending && (
                        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shrink-0">
                                    ⚠️
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-amber-900">
                                        Previous Day Sheet Awaiting Admin Approval
                                    </h4>
                                    <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                                        The previous day sheet {report.previousDaySheetDate ? `(${new Date(report.previousDaySheetDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})` : ""} has not been approved yet. The opening balance will not show and this day sheet cannot be closed until the Administrator approves it.
                                    </p>
                                </div>
                            </div>
                            {isAdmin && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push("/dashboard/personal/approval/day-sheet")}
                                    className="shrink-0 text-xs font-bold border-amber-600/40 text-amber-950 bg-white hover:bg-amber-50 rounded-xl cursor-pointer"
                                    type="button"
                                >
                                    View Approvals
                                </Button>
                            )}
                        </div>
                    )}

                    {/* SMALL BALANCE CARDS */}
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                        <SmallBalanceCard
                            title="Opening Balance"
                            amount={report.openingBalance}
                            isPendingApproval={isPreviousDayPending}
                        />
                        <SmallBalanceCard
                            title="Closing Balance"
                            amount={report.closingBalance}
                            isClosing={true}
                            isPendingApproval={isPreviousDayPending}
                        />
                    </div>

                    {/* DAY SUMMARY */}
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                        <CardContent className="p-4 md:p-6">
                            <h3 className="font-bold text-center text-slate-900 mb-3 text-base">
                                Day Summary (Smart Savings)
                            </h3>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="border border-emerald-950/20 p-2.5 text-left">Credits (Income / Deposits)</th>
                                            <th className="border border-emerald-950/20 p-2.5 text-right">Amount</th>
                                            <th className="border border-emerald-950/20 p-2.5 text-left">Debits (Expenses / Payouts)</th>
                                            <th className="border border-emerald-950/20 p-2.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({
                                            length: Math.max(
                                                report.income?.length || 0,
                                                report.expenses?.length || 0
                                            ),
                                        }).map((_, i) => (
                                            <tr key={i} className="hover:bg-slate-50/70">
                                                <td className="border border-slate-200 p-2.5 font-medium text-slate-900">
                                                    {report.income?.[i]?._id || ""}
                                                </td>
                                                <td className="border border-slate-200 p-2.5 text-right font-bold text-[#241E4E]">
                                                    {report.income?.[i]
                                                        ? `₹${format(report.income[i].total)}`
                                                        : ""}
                                                </td>
                                                <td className="border border-slate-200 p-2.5 font-medium text-slate-900">
                                                    {report.expenses?.[i]?._id || ""}
                                                </td>
                                                <td className="border border-slate-200 p-2.5 text-right font-bold text-rose-600">
                                                    {report.expenses?.[i]
                                                        ? `₹${format(report.expenses[i].total)}`
                                                        : ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between mt-3 border-t border-slate-200 pt-3 text-sm font-bold gap-2">
                                <p className="text-[#241E4E] font-black">
                                    Total Income: ₹{format(totalIncome)}
                                </p>
                                <p className="text-rose-700 font-bold">
                                    Total Expense: ₹{format(totalExpense)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CASH DENOMINATION */}
                    <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-white">
                        <CardContent className="p-4 md:p-6">
                            <h3 className="font-bold text-center text-slate-900 mb-3 text-base">
                                Cash Denomination
                            </h3>

                            <div className="overflow-x-auto max-w-lg mx-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#241E4E] text-[#7C5CFC] font-bold text-xs uppercase tracking-wider">
                                        <tr className="text-center">
                                            <th className="border border-emerald-950/20 p-2.5">Note</th>
                                            <th className="border border-emerald-950/20 p-2.5">Count</th>
                                            <th className="border border-emerald-950/20 p-2.5">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {denomKeys.map((k) => (
                                            <tr key={k} className="text-center hover:bg-slate-50/50">
                                                <td className="border border-slate-200 p-1.5 font-bold text-slate-800">
                                                    ₹{k}
                                                </td>
                                                <td className="border border-slate-200 p-1.5">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        disabled={isPending || isApproved || !canSaveAndClose}
                                                        value={cashDenom[k]}
                                                        onChange={(e) => updateDenom(k, e.target.value)}
                                                        className="h-8 text-center font-bold bg-white"
                                                    />
                                                </td>
                                                <td className="border border-slate-200 p-1.5 font-bold text-slate-900 font-mono">
                                                    ₹{format(cashDenom[k] * Number(k))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-right font-black text-slate-900 mt-3 text-base max-w-lg mx-auto font-mono">
                                TOTAL CASH: ₹{format(denomTotal)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* ACTIONS */}
                    <div className="flex flex-col items-end gap-3 no-print">
                        <div className="flex justify-end gap-4">
                            {canSaveAndClose ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveTemp}
                                        disabled={isApproved || isPending}
                                        type="button"
                                        className="rounded-xl font-bold border border-[#7C5CFC]/40 hover:bg-emerald-50 text-[#241E4E] cursor-pointer"
                                    >
                                        Save Draft
                                    </Button>

                                    {!isApproved && !isPending && (
                                        <Button
                                            onClick={handleCloseDay}
                                            disabled={denomTotal !== report.closingBalance}
                                            className="bg-gradient-to-r from-[#241E4E] to-[#2F2864] hover:from-[#2F2864] hover:to-[#241E4E] text-[#7C5CFC] border border-[#7C5CFC]/40 font-bold rounded-xl cursor-pointer shadow-xs"
                                            type="button"
                                        >
                                            {isRejected ? "Save & Re-Submit" : "Save & Close"}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>
                                        {isPreviousDayPending
                                            ? "Save & Close is locked: The previous day sheet has not been approved by the Administrator yet."
                                            : `Save & Close is available on the current date (${todayIST}) only. Only Administrators are authorized to save or close previous days.`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* CLOSED BY EMPLOYEE AND TIME */}
                        {(closedByName || closedDateVal) && (
                            <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                                {closedByName && (
                                    <span className="flex items-center gap-1 font-medium text-slate-700">
                                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        Closed by: <span className="font-semibold text-slate-900">{closedByName}</span>
                                    </span>
                                )}

                                {closedDateVal && (
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        Time:{" "}
                                        <span className="font-mono font-medium text-slate-800">
                                            {new Date(closedDateVal).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}{" "}
                                            at{" "}
                                            {new Date(closedDateVal).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true,
                                            })}
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* PRINT STYLES */}
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    input {
                        border: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                        text-align: right;
                    }
                    .print-area {
                        padding: 0;
                        margin: 0;
                    }
                }
            `}</style>
        </form>
    );
}

/* ---------------- SMALL BALANCE CARD ---------------- */

function SmallBalanceCard({
    title,
    amount,
    isClosing,
    isPendingApproval,
}: {
    title: string;
    amount: number;
    isClosing?: boolean;
    isPendingApproval?: boolean;
}) {
    if (isPendingApproval) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 p-4 text-white shadow-md border border-amber-500/40 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    {title}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                    <span>⚠️</span> Awaiting Approval
                </div>
                <p className="text-[10px] text-amber-200/70 mt-1.5">
                    Previous day sheet pending
                </p>
            </div>
        );
    }

    return isClosing ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C5CFC] via-[#6846EB] to-[#5835E5] p-4 text-white shadow-md border border-[#7C5CFC]/30 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-200">
                {title}
            </p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
                ₹{Number(amount || 0).toFixed(2)}
            </p>
        </div>
    ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#1C173D] p-4 text-white shadow-md border border-[#7C5CFC]/30 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC]">
                {title}
            </p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
                ₹{Number(amount || 0).toFixed(2)}
            </p>
        </div>
    );
}

export default function DaySheetPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Day Sheet...</div>}>
            <SavingsDaySheetContent />
        </Suspense>
    );
}
