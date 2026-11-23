"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { toast } from "sonner";
import { DaySheetReport } from "@/types/daysheet";
import { useSession } from "next-auth/react";
import { format as formatDateTime } from "date-fns";
import { getTodayIST } from "@/lib/ist";

// Extended interface if your types haven't been updated yet
interface ExtendedReport extends DaySheetReport {
    cashBox?: {
        employee?: { name: string } | string;
        approvedBy?: { name: string } | string;
        updatedAt?: string | Date;
        date?: string | Date;
    };
    closedBy?: { name: string } | string;
    closedAt?: string | Date;
    approvedBy?: { name: string } | string;
    approvedAt?: string | Date;
}

export default function SummaryReportPage() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ExtendedReport | null>(null);

    // Single Date
    const [selectedDate, setSelectedDate] = useState(() => getTodayIST());

    useEffect(() => {
        if (isTeller) {
            setSelectedDate(todayIST);
        }
    }, [isTeller, todayIST]);

    const format = (v: number) => Number(v || 0).toFixed(2);

    /* ---------------- DATE CONTROLS ---------------- */

    const changeDate = (days: number) => {
        if (isTeller) return;
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().slice(0, 10));
    };

    const resetToday = () => {
        setSelectedDate(getTodayIST());
    };

    /* ---------------- LOAD REPORT ---------------- */

    useEffect(() => {
        async function loadReport() {
            setLoading(true);

            try {
                const dateToFetch = isTeller ? todayIST : selectedDate;
                const res = await fetch(
                    `/api/report/day-sheet?from=${dateToFetch}&to=${dateToFetch}`
                );

                const json = await res.json();

                if (!json.success) {
                    toast.error(json.error || "No records found!");
                    setReport(null);
                } else {
                    setReport(json.report);
                }
            } catch {
                toast.error("Failed to fetch summary report");
                setReport(null);
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, [selectedDate]);

    const cashBoxStatus = report?.cashBoxStatus || null;
    const isApproved = cashBoxStatus === "APPROVED";
    const isPending = cashBoxStatus === "PENDING";
    const isRejected = cashBoxStatus === "REJECTED";

    const cashBoxData = report?.cashBox || null;

    // Helper to safely extract names whether it was populated as an object or just left as an ID
    const getEmpName = (emp: { name: string } | string | undefined | null) => {
        if (!emp) return "";
        return typeof emp === "object" ? emp.name : emp;
    };

    const formatTime = (dateVal: string | Date | null | undefined) => {
        if (!dateVal) return null;
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return null;
            return formatDateTime(d, "hh:mm a");
        } catch {
            return null;
        }
    };

    const closedByName =
        (cashBoxData?.employee ? getEmpName(cashBoxData.employee) : null) ||
        (report?.closedBy ? getEmpName(report.closedBy) : null);

    const closedAtVal =
        report?.closedAt ||
        cashBoxData?.updatedAt ||
        cashBoxData?.date ||
        null;

    const closingTime = formatTime(closedAtVal);

    const approvedByName =
        (cashBoxData?.approvedBy ? getEmpName(cashBoxData.approvedBy) : null) ||
        (report?.approvedBy ? getEmpName(report.approvedBy) : null);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-4 print-area">
            <LoadingOverlay show={loading} />
            <PageHeader />

            {/* HEADER */}
            <div className="flex justify-between items-center no-print">
                <h1 className="text-lg font-bold text-gray-700">
                    SUMMARY REPORT
                </h1>

                <Button variant="outline" onClick={() => window.print()}>
                    Print
                </Button>
            </div>

            {/* DATE CONTROLS */}
            {isTeller ? (
                <div className="flex justify-center no-print">
                    <div className="flex items-center px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold">
                        Report date: Today (IST) ({todayIST})
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center items-end gap-3 no-print">
                    <Button
                        variant="outline"
                        onClick={() => changeDate(-1)}
                        type="button"
                    >
                        ⬅
                    </Button>

                    <div>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="w-40"
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => changeDate(1)}
                        type="button"
                    >
                        ➡
                    </Button>

                    <Button variant="secondary" onClick={resetToday} type="button">
                        Today
                    </Button>
                </div>
            )}

            {/* STATUS (NOT PRINTABLE) */}
            {cashBoxStatus && (
                <p className="text-center font-semibold no-print">
                    Status:{" "}
                    <span
                        className={
                            isApproved
                                ? "text-green-600"
                                : isPending
                                    ? "text-yellow-600"
                                    : isRejected
                                        ? "text-red-600"
                                        : "text-gray-600"
                        }
                    >
                        {cashBoxStatus}
                    </span>
                </p>
            )}

            {!report ? (
                <p className="text-center text-gray-400 py-10">
                    No summary available
                </p>
            ) : (
                <>
                    {/* PRINT TITLE */}
                    <div className="text-center space-y-2 mb-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-gray-800">
                                DAILY SUMMARY REPORT
                            </h2>
                            {session?.user?.branch && (
                                <p className="text-center text-sm text-gray-600">
                                    Branch: {session.user.branch.name}
                                </p>
                            )}
                            <p className="text-xs text-gray-500">
                                Report Date: {report.from}
                            </p>
                        </div>

                        {/* CASHBOX APPROVAL INFO */}
                        {(closedByName || closingTime || approvedByName) && (
                            <div className="inline-flex flex-wrap justify-center items-center gap-4 text-xs mt-2 bg-gray-50 border p-2 px-4 rounded-md shadow-sm">
                                {closedByName && (
                                    <p>
                                        <span className="text-gray-500">Closed By: </span>
                                        <span className="font-bold text-gray-800 uppercase">
                                            {closedByName}
                                        </span>
                                    </p>
                                )}

                                {closedByName && closingTime && (
                                    <span className="text-gray-300">|</span>
                                )}

                                {closingTime && (
                                    <p>
                                        <span className="text-gray-500">Closed At: </span>
                                        <span className="font-bold text-gray-800 uppercase">
                                            {closingTime}
                                        </span>
                                    </p>
                                )}

                                {(closedByName || closingTime) && approvedByName && (
                                    <span className="text-gray-300">|</span>
                                )}

                                {approvedByName && (
                                    <p>
                                        <span className="text-gray-500">Approved By: </span>
                                        <span className="font-bold text-gray-800 uppercase">
                                            {approvedByName}
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* OPENING / CLOSING BALANCE SMALL DISPLAY */}
                    <div className="border rounded-md p-3 text-sm bg-gray-50">
                        <div className="flex justify-between border-b pb-2 mb-2">
                            <span className="font-semibold text-gray-700">
                                Opening Balance
                            </span>
                            <span className="font-bold text-gray-900">
                                ₹{format(report.openingBalance)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-semibold text-gray-700">
                                Closing Balance
                            </span>
                            <span className="font-bold text-gray-900">
                                ₹{format(report.closingBalance)}
                            </span>
                        </div>
                    </div>

                    {/* DAY SUMMARY TABLE */}
                    <Card>
                        <CardContent>
                            <h3 className="font-semibold text-center mb-3">
                                Day Summary
                            </h3>

                            <table className="w-full text-sm border">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border p-2 text-left">
                                            Income
                                        </th>
                                        <th className="border p-2 text-right">
                                            Amount
                                        </th>
                                        <th className="border p-2 text-left">
                                            Expense
                                        </th>
                                        <th className="border p-2 text-right">
                                            Amount
                                        </th>
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
                                    Total Income: ₹{format(report.totalIncome)}
                                </p>
                                <p className="text-red-700">
                                    Total Expense: ₹{format(report.totalExpense)}
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

                            {report.denomination && report.denomination.length > 0 ? (
                                <>
                                    <table className="w-full text-sm border">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">
                                                    Note
                                                </th>
                                                <th className="border p-2 text-center">
                                                    Count
                                                </th>
                                                <th className="border p-2 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.denomination.map((d, idx) => (
                                                <tr key={idx}>
                                                    <td className="border p-2">
                                                        ₹{d.note}
                                                    </td>
                                                    <td className="border p-2 text-center">
                                                        {d.count}
                                                    </td>
                                                    <td className="border p-2 text-right font-semibold">
                                                        ₹{format(d.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <p className="text-right font-bold mt-2">
                                        Grand Total: ₹
                                        {format(
                                            report.denomination.reduce(
                                                (sum, d) => sum + (d.total || 0),
                                                0
                                            )
                                        )}
                                    </p>
                                </>
                            ) : (
                                <p className="text-center text-gray-400 py-4">
                                    No denomination data available.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* SIGNATURE SECTION */}
                    <div className="flex justify-between items-center mt-12 text-sm font-semibold">
                        <div className="text-left">
                            <p className="border-t border-gray-400 w-50 pt-2">Cash Operation Officer Sign</p>
                        </div>

                        <div className="text-right">
                            <p className="border-t border-gray-400 w-40 pt-2">Manager Sign</p>
                        </div>
                    </div>
                </>
            )}

            {/* PRINT STYLES */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 12mm;
                    }

                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .print-area {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                    }

                    table {
                        font-size: 12px !important;
                    }

                    th,
                    td {
                        padding: 6px !important;
                    }
                }
            `}</style>
        </div>
    );
}