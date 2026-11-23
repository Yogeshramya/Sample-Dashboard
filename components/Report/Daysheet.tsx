"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { CashDenomination, DaySheetReport } from "@/types/daysheet";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, UserCheck, Clock } from "lucide-react";
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

export default function DaySheetPage() {
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
        setCashDenom(prev => ({
            ...prev,
            [key]: Math.max(0, Number(value)),
        }));
    };

    const format = (v: number) => Number(v || 0).toFixed(2);

    /* ---------------- DATE CONTROLS ---------------- */

    const changeDate = (days: number) => {
        if (isTeller) return;
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);

        const newDate = d.toISOString().slice(0, 10);

        router.push(`/dashboard/report/day-sheet?date=${newDate}`, { scroll: false });
    };

    const resetToday = () => {
        if (isTeller) return;
        router.push(`/dashboard/report/day-sheet?date=${todayIST}`);
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
                `/api/report/day-sheet?from=${date}&to=${date}&type=TRUE${branchParam}`
            );

            const sheetJson = await sheetRes.json();

            if (!sheetJson.success) {
                toast.error(sheetJson.error || "No day sheet found");
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

            // If API gives denomination already (approved/saved cashbox)
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
            toast.error("Failed to load day sheet");
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

        if (isPreviousDayPending) {
            toast.error("Cannot save draft: Previous day sheet is awaiting Admin Approval.");
            return;
        }

        if (!canSaveAndClose) {
            toast.error("Day sheet draft can only be saved on the current date. Only administrators can edit previous days.");
            return;
        }

        const payload = {
            date: selectedDate,
            denomination: denomKeys.map(k => ({
                note: Number(k),
                count: cashDenom[k],
                total: cashDenom[k] * Number(k),
            })),
        };

        try {
            const res = await fetch("/api/report/day-sheet/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Draft saved");
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
            toast.error("Cannot close day sheet: Previous day sheet is awaiting Admin Approval.");
            return;
        }

        if (!canSaveAndClose) {
            toast.error("Day sheet can only be closed on the current date. Only administrators can close previous days.");
            return;
        }

        if (denomTotal !== report.closingBalance)
            return toast.error("Denomination mismatch!");

        if (!confirm("Once sent for approval, this cannot be edited. Continue?"))
            return;

        const payload = {
            date: selectedDate,
            openingBalance: report.openingBalance,
            closingBalance: report.closingBalance,
            denomination: denomKeys.map(k => ({
                note: Number(k),
                count: cashDenom[k],
                total: cashDenom[k] * Number(k),
            })),
        };

        try {
            const res = await fetch("/api/report/day-sheet/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Day closed successfully");
                await loadSheetData(selectedDate);
            } else {
                toast.error(json.error || "Close failed");
            }
        } catch {
            toast.error("Close failed");
        }
    };

    const totalIncome =
        report?.income.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    const totalExpense =
        report?.expenses.reduce((sum, e) => sum + (e.total || 0), 0) || 0;

    const userBranch = (session?.user as CustomUser)?.branch;

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
        <form className="p-6 w-full max-w-full mx-auto space-y-6 print-area">
            <LoadingOverlay show={loading} />

            <div className="flex items-center justify-between mb-4 no-print">
                <Button
                    variant="ghost"
                    className="flex items-center gap-1 bg-gray-900 text-white hover:text-gray-900"
                    onClick={() => router.push("/dashboard/report")}
                    type="button"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Button>
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-bold text-gray-700">
                    Day Accounts Summary - {selectedDate}
                </h1>
            </div>

            {/* DATE NAVIGATION */}
            <div className="flex justify-center items-center gap-3 no-print">
                {isTeller ? (
                    <div className="text-sm font-medium text-slate-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        Report date: Today (IST) — {selectedDate}
                    </div>
                ) : (
                    <>
                        <Button variant="outline" onClick={() => changeDate(-1)} type="button">
                            ⬅
                        </Button>

                        <p className="font-semibold text-gray-700">
                            {selectedDate}
                        </p>

                        <Button variant="outline" onClick={() => changeDate(1)} type="button">
                            ➡
                        </Button>

                        <Button variant="secondary" onClick={resetToday} type="button">
                            Today
                        </Button>
                    </>
                )}
            </div>

            {userBranch && (
                <p className="text-center text-sm text-gray-600">
                    Branch: {userBranch.name}
                </p>
            )}

            {cashBoxStatus && (
                <p className="text-center font-semibold">
                    Status:{" "}
                    <span
                        className={
                            isApproved
                                ? "text-green-600"
                                : isPending
                                    ? "text-yellow-600"
                                    : "text-red-600"
                        }
                    >
                        {cashBoxStatus}
                    </span>
                </p>
            )}

            {!report ? (
                <p className="text-center text-gray-400 py-10">
                    No day sheet available
                </p>
            ) : (
                <>
                    {/* PRIOR DAY APPROVAL ALERT BANNER */}
                    {isPreviousDayPending && (
                        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4.5 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 no-print">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-0.5">⚠️</span>
                                    <div>
                                        <h4 className="font-bold text-sm tracking-tight text-amber-950 flex items-center gap-2">
                                            Previous Day Sheet Awaiting Admin Approval
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                                                Action Required
                                            </span>
                                        </h4>
                                        <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                                            The day sheet for{" "}
                                            <strong className="font-semibold text-amber-950">
                                                {report?.previousDaySheetDate
                                                    ? new Date(report.previousDaySheetDate).toLocaleDateString("en-IN", {
                                                          day: "2-digit",
                                                          month: "short",
                                                          year: "numeric",
                                                      })
                                                    : "the previous working day"}
                                            </strong>{" "}
                                            has not been approved yet. Under financial security policies, today&apos;s opening balance is locked and day closure is disabled until the previous day sheet is approved by an Administrator.
                                        </p>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => router.push("/dashboard/approval/day-sheet")}
                                        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                                    >
                                        Review Approvals →
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SMALL BALANCE CARDS */}
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                        <SmallBalanceCard
                            title="Opening Balance"
                            amount={report.openingBalance}
                            isPendingApproval={isPreviousDayPending}
                            subtitle="Previous day sheet pending"
                        />
                        <SmallBalanceCard
                            title="Closing Balance"
                            amount={report.closingBalance}
                        />
                    </div>

                    {/* DAY SUMMARY */}
                    <Card>
                        <CardContent>
                            <h3 className="font-semibold text-center mb-3">
                                Day Summary
                            </h3>

                            <table className="w-full text-sm border">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border p-2 text-left">Credits</th>
                                        <th className="border p-2 text-right">Amount</th>
                                        <th className="border p-2 text-left">Debits</th>
                                        <th className="border p-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({
                                        length: Math.max(
                                            report.income.length,
                                            report.expenses.length
                                        ),
                                    }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="border p-2">
                                                {report.income[i]?._id || ""}
                                            </td>
                                            <td className="border p-2 text-right">
                                                {report.income[i]
                                                    ? `₹${format(report.income[i].total)}`
                                                    : ""}
                                            </td>
                                            <td className="border p-2">
                                                {report.expenses[i]?._id || ""}
                                            </td>
                                            <td className="border p-2 text-right">
                                                {report.expenses[i]
                                                    ? `₹${format(report.expenses[i].total)}`
                                                    : ""}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-between mt-3 border-t pt-2 text-sm font-semibold">
                                <p className="text-green-700">
                                    Total Income: ₹{format(totalIncome)}
                                </p>
                                <p className="text-red-700">
                                    Total Expense: ₹{format(totalExpense)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CASH DENOMINATION */}
                    <Card>
                        <CardContent>
                            <h3 className="font-semibold text-center mb-2">
                                Cash Denomination
                            </h3>

                            <table className="w-full text-sm border">
                                <tbody>
                                    {denomKeys.map(k => (
                                        <tr key={k} className="text-center">
                                            <td className="border p-1">
                                                ₹{k}
                                            </td>
                                            <td className="border p-1">
                                                <Input
                                                    disabled={isPending || isApproved || !canSaveAndClose || isPreviousDayPending}
                                                    value={cashDenom[k]}
                                                    onChange={e =>
                                                        updateDenom(k, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="border p-1 font-medium">
                                                ₹{format(cashDenom[k] * Number(k))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <p className="text-right font-bold mt-2">
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
                                    >
                                        Save
                                    </Button>

                                    {!isApproved && !isPending && (
                                        <Button
                                            onClick={handleCloseDay}
                                            disabled={denomTotal !== report.closingBalance}
                                            className="bg-green-600 text-white"
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
                                        {isPreviousDayPending ? (
                                            <>Save & Close is locked: The previous day sheet has not been approved by the Administrator yet.</>
                                        ) : (
                                            <>
                                                Save and Close is available on the current date ({todayIST}) only.
                                                Only Administrators are authorized to save or close previous days.
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* CLOSED BY EMPLOYEE AND TIME */}
                        {(closedByName || closedDateVal) && (
                            <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-xs">
                                {closedByName && (
                                    <span className="flex items-center gap-1 font-medium text-gray-700">
                                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        Closed by: <span className="font-semibold text-gray-900">{closedByName}</span>
                                    </span>
                                )}

                                {closedDateVal && (
                                    <span className="flex items-center gap-1 text-gray-600">
                                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        Time:{" "}
                                        <span className="font-mono font-medium text-gray-800">
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
    isPendingApproval,
    subtitle,
}: {
    title: string;
    amount: number;
    isPendingApproval?: boolean;
    subtitle?: string;
}) {
    return (
        <Card className={`border ${isPendingApproval ? "border-amber-400 bg-amber-50/40" : "border-blue-400"}`}>
            <CardContent className="text-center p-3">
                <p className={`text-xs font-medium ${isPendingApproval ? "text-amber-800" : "text-blue-600"}`}>
                    {title}
                </p>
                {isPendingApproval ? (
                    <div className="py-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-950 border border-amber-300">
                            ⏳ Awaiting Approval
                        </span>
                        {subtitle && (
                            <p className="text-[11px] text-amber-700 mt-1 font-medium">{subtitle}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-lg font-bold">
                        ₹{Number(amount).toFixed(2)}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}