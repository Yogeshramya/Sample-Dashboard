"use client";

import { useEffect, useState } from "react";
import LoadingOverlay from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { DaySheetReport } from "@/types/daysheet";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { Input } from "../ui/input";
import { getTodayIST } from "@/lib/ist";

export default function TrialBalancePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<DaySheetReport | null>(null);

    const [fromDate, setFromDate] = useState(todayIST);
    const [toDate, setToDate] = useState(todayIST);

    useEffect(() => {
        if (isTeller) {
            setFromDate(todayIST);
            setToDate(todayIST);
        }
    }, [isTeller, todayIST]);

    const format = (v: number) =>
        Number(v || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });


    useEffect(() => {
        async function loadReport() {
            setLoading(true);

            try {
                const fDate = isTeller ? todayIST : fromDate;
                const tDate = isTeller ? todayIST : toDate;

                const res = await fetch(
                    `/api/report/day-sheet?from=${fDate}&to=${tDate}&type=TRUE`
                );

                const json = await res.json();

                if (!json.success) {
                    toast.error(
                        json.error || "Failed to load trial balance"
                    );
                    setReport(null);
                    return;
                }

                setReport(json.report);
            } catch {
                toast.error("Unable to load report");
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, [fromDate, toDate, isTeller, todayIST]);

    const totalCredit =
        report?.income?.reduce(
            (sum, item) => sum + (item.total || 0),
            0
        ) || 0;

    const totalDebit =
        report?.expenses?.reduce(
            (sum, item) => sum + (item.total || 0),
            0
        ) || 0;

    const difference = totalCredit - totalDebit;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 print-area">
            <LoadingOverlay show={loading} />

            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <Button
                    variant="ghost"
                    className="bg-gray-900 text-white"
                    onClick={() => router.push("/dashboard/report")}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>

                <Button
                    variant="outline"
                    onClick={() => window.print()}
                >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                </Button>
            </div>

            {/* Title */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">
                    TRIAL BALANCE
                </h1>

                {session?.user?.branch && (
                    <p className="text-sm text-gray-600 mt-1">
                        Branch: {session.user.branch.name}
                    </p>
                )}
            </div>

            {/* Date */}
            {isTeller ? (
                <div className="flex justify-center no-print">
                    <div className="flex items-center px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold">
                        Report date: Today (IST) ({todayIST})
                    </div>
                </div>
            ) : (
                <Card className="p-4 no-print">
                    <div className="grid md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="text-sm font-medium">
                                From Date
                            </label>

                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) =>
                                    setFromDate(e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                To Date
                            </label>

                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) =>
                                    setToDate(e.target.value)
                                }
                            />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => {
                                setFromDate(todayIST);
                                setToDate(todayIST);
                            }}
                        >
                            Today
                        </Button>
                    </div>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Credit"
                    amount={totalCredit}
                    color="green"
                />

                <SummaryCard
                    title="Total Debit"
                    amount={totalDebit}
                    color="red"
                />

                <SummaryCard
                    title="Difference"
                    amount={Math.abs(difference)}
                    color={
                        difference === 0
                            ? "green"
                            : "yellow"
                    }
                />

                <SummaryCard
                    title="Closing Balance"
                    amount={report?.closingBalance || 0}
                    color="blue"
                />
            </div>

            {/* Trial Balance */}
            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-3 text-left">
                                    Credits
                                </th>

                                <th className="border p-3 text-right">
                                    Amount
                                </th>

                                <th className="border p-3 text-left">
                                    Debits
                                </th>

                                <th className="border p-3 text-right">
                                    Amount
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {Array.from({
                                length: Math.max(
                                    report?.income?.length || 0,
                                    report?.expenses?.length || 0
                                ),
                            }).map((_, i) => (
                                <tr key={i}>
                                    <td className="border p-3">
                                        {report?.income?.[i]?._id ||
                                            ""}
                                    </td>

                                    <td className="border p-3 text-right text-green-700 font-medium">
                                        {report?.income?.[i]
                                            ? `₹${format(
                                                report
                                                    .income[i]
                                                    .total
                                            )}`
                                            : ""}
                                    </td>

                                    <td className="border p-3">
                                        {report?.expenses?.[i]
                                            ? report
                                                .expenses[i]
                                                ._id
                                            : ""}
                                    </td>

                                    <td className="border p-3 text-right text-red-700 font-medium">
                                        {report?.expenses?.[i]
                                            ? `₹${format(
                                                report
                                                    .expenses[i]
                                                    .total
                                            )}`
                                            : ""}
                                    </td>
                                </tr>
                            ))}

                            <tr className="bg-slate-50 font-bold">
                                <td className="border p-3">
                                    TOTAL CREDIT
                                </td>

                                <td className="border p-3 text-right text-green-700">
                                    ₹{format(totalCredit)}
                                </td>

                                <td className="border p-3">
                                    TOTAL DEBIT
                                </td>

                                <td className="border p-3 text-right text-red-700">
                                    ₹{format(totalDebit)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Status */}
            <Card>
                <CardContent className="py-4 text-center">
                    <p className="font-semibold text-lg">
                        Status :
                        <span
                            className={
                                difference === 0
                                    ? "text-green-600 ml-2"
                                    : "text-yellow-600 ml-2"
                            }
                        >
                            {difference === 0
                                ? "Balanced ✓"
                                : "Difference ₹" +
                                format(
                                    Math.abs(
                                        difference
                                    )
                                )}
                        </span>
                    </p>
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }

                    .print-area {
                        padding: 0;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}

function SummaryCard({
    title,
    amount,
    color,
}: {
    title: string;
    amount: number;
    color: string;
}) {
    const colors = {
        green: "border-green-500 text-green-700",
        red: "border-red-500 text-red-700",
        yellow: "border-yellow-500 text-yellow-700",
        blue: "border-blue-500 text-blue-700",
    };

    return (
        <Card
            className={
                colors[
                color as keyof typeof colors
                ]
            }
        >
            <CardContent className="text-center p-4">
                <p className="text-xs font-medium">
                    {title}
                </p>

                <p className="text-xl font-bold mt-1">
                    ₹
                    {Number(amount).toLocaleString(
                        "en-IN",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }
                    )}
                </p>
            </CardContent>
        </Card>
    );
}