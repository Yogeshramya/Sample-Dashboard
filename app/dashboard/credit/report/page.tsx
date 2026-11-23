"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PageHeader from "@/components/PageHeader";
import { Credit } from "@/types/credit";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";

export default function CreditReport() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [records, setRecords] = useState<Credit[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [titles, setTitles] = useState<{ _id: string; title: string }[]>([]);

    const [summary, setSummary] = useState({
        totalAmount: 0,
        cashAmount: 0,
        bankAmount: 0,
        count: 0,
    });

    /* ================= FILTERS ================= */
    const [filters, setFilters] = useState({
        start: "",
        end: "",
        title: "ALL", // TITLE IS TYPE
    });

    useEffect(() => {
        if (isTeller) {
            setFilters((prev) => ({ ...prev, start: todayIST, end: todayIST }));
        }
    }, [isTeller, todayIST]);

    /* ================= LOAD TITLES ================= */
    const loadTitles = useCallback(async () => {
        try {
            const res = await fetch("/api/credit/title");
            const data = await res.json();

            if (data.success) {
                setTitles(data.titles || []);
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    /* ================= FETCH CREDITS ================= */
    const fetchCredits = useCallback(async () => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            const startVal = isTeller ? todayIST : filters.start;
            const endVal = isTeller ? todayIST : filters.end;
            if (startVal) queryParams.append("start", startVal);
            if (endVal) queryParams.append("end", endVal);
            if (filters.title !== "ALL") queryParams.append("title", filters.title.toString());

            const url = `/api/credit?${queryParams.toString()}`;

            const res = await fetch(url);
            const data = await res.json();

            setRecords(data.credits || []);

            if (data.summary) {
                setSummary({
                    totalAmount: data.summary.totalAmount || 0,
                    cashAmount: data.summary.cashAmount || 0,
                    bankAmount: data.summary.bankAmount || 0,
                    count: data.summary.count || 0,
                });
            }
        } catch {
            toast.error("Failed to load credit report");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTitles();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadTitles]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCredits();
        }, 0);

        return () => clearTimeout(timer);
    }, [filters, fetchCredits]);

    const filterApply = () => {
        fetchCredits();
    };

    /* ================= APPROVED ONLY ================= */
    const approvedRecords = useMemo(
        () => records.filter((r) => r.status === "APPROVED"),
        [records]
    );

    /* ================= EXPORT EXCEL ================= */
    const exportExcel = async () => {
        if (!approvedRecords.length) return toast.warning("No data to export");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Approved Credits");

        // Define columns matching debit structure
        worksheet.columns = [
            { header: "Voucher Code", key: "code", width: 18 },
            { header: "Date", key: "date", width: 15 },
            { header: "Type", key: "type", width: 25 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Mode", key: "mode", width: 15 },
            { header: "Employee", key: "employee", width: 25 },
        ];

        worksheet.getRow(1).font = { bold: true };

        approvedRecords.forEach((r) => {
            worksheet.addRow({
                code: (r).code || "-",
                date: r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-",
                type: r.title,
                amount: r.amount,
                mode: r.mode,
                employee: r.employee?.name || "N/A",
            });
        });

        try {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "Approved_Credit_Report.xlsx";
            anchor.click();

            window.URL.revokeObjectURL(url);
            toast.success("Excel exported successfully");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to generate Excel file");
        }
    };

    /* ================= EXPORT PDF ================= */
    const exportPDF = () => {
        if (!approvedRecords.length) return toast.warning("No data to export");

        const doc = new jsPDF();
        autoTable(doc, {
            head: [["Code", "Date", "Type", "Amount", "Mode", "Entered By"]],
            body: approvedRecords.map((r) => [
                (r).code || "-",
                r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-",
                r.title,
                `₹ ${Number(r.amount || 0).toLocaleString("en-IN")}`,
                r.mode,
                r.employee?.name || "N/A",
            ]),
        });
        doc.save("Approved_Credit_Report.pdf");
    };

    /* ================= PRINT HANDLER ================= */
    const handlePrint = () => {
        if (!approvedRecords.length) {
            return toast.warning("No data to print");
        }
        window.print();
    };

    return (
        <section className="max-w-7xl mx-auto space-y-6 p-4 print:p-0 print:max-w-full print:space-y-4">
            {/* ================= PRINT-SPECIFIC CSS ================= */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        background: #fff !important;
                        color: #000 !important;
                    }
                    nav, header, aside, .print\\:hidden {
                        display: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #333 !important;
                        padding: 6px 8px !important;
                    }
                    thead tr {
                        background-color: #f1f5f9 !important;
                        color: #000 !important;
                    }
                }
            `}</style>

            {/* ================= SCREEN-ONLY PAGE HEADER ================= */}
            <div className="print:hidden">
                <PageHeader />
            </div>

            {/* ================= PRINT-ONLY COMPANY HEADER ================= */}
            <div className="hidden print:flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-2">
                {/* Top Left: Logo */}
                <div className="w-40 h-20 relative">
                    <Image
                        src="/default/logo_black.png"
                        alt="Company Logo"
                        width={80}
                        height={80}
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Top Right: Company Name & Address */}
                <div className="text-right max-w-md">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                        SAMPLE PRIME SMALL FINANCE PVT LTD
                    </h2>
                    <p className="text-xs text-slate-700 leading-snug mt-1">
                        No. 112, PALAVATHANKATTALAI<br />
                        KARAIKAL MAIN ROAD KUMBAKONAM,<br />
                        THANJAVUR DISTRICT, PINCODE: 612401.
                    </p>
                </div>
            </div>

            {/* Title */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-amber-500 print:text-xl print:text-black">
                    CREDIT REPORT (APPROVED)
                </h1>
                {(filters.start || filters.end) && (
                    <p className="hidden print:block text-xs font-medium text-slate-600">
                        Period: {filters.start || "Beginning"} to {filters.end || "Present"}
                    </p>
                )}
            </div>

            {/* ================= SCREEN-ONLY FILTERS ================= */}
            <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white/50 backdrop-blur-sm border-slate-200 print:hidden">
                {isTeller ? (
                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Report Date</label>
                        <div className="flex items-center px-3 py-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold mt-1">
                            Today (IST): {todayIST}
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Start Date</label>
                            <Input
                                type="date"
                                value={filters.start}
                                onChange={(e) =>
                                    setFilters({ ...filters, start: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">End Date</label>
                            <Input
                                type="date"
                                value={filters.end}
                                onChange={(e) =>
                                    setFilters({ ...filters, end: e.target.value })
                                }
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="text-sm font-semibold text-slate-700">Type</label>
                    <select
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                        value={filters.title}
                        onChange={(e) =>
                            setFilters({
                                ...filters,
                                title: e.target.value,
                            })
                        }
                    >
                        <option value="ALL">All Types</option>
                        {titles.map((title) => (
                            <option key={title._id} value={title.title}>
                                {title.title}
                            </option>
                        ))}
                    </select>
                </div>

                <Button
                    onClick={filterApply}
                    className="bg-amber-500 text-slate-900 hover:bg-amber-600 font-semibold"
                >
                    Apply Filter
                </Button>
            </Card>

            {/* ================= SUMMARY CARDS ================= */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:gap-2 print:grid-cols-4">
                <Card className="p-4 print:p-2 text-center border-l-4 border-l-slate-400 print:shadow-none print:border">
                    <p className="text-slate-500 font-medium text-xs sm:text-sm">Total Entries</p>
                    <h2 className="text-xl print:text-base font-bold text-slate-900">
                        {summary.count}
                    </h2>
                </Card>

                <Card className="p-4 print:p-2 text-center border-l-4 border-l-amber-500 shadow-md print:shadow-none print:border">
                    <p className="text-slate-500 font-medium text-xs sm:text-sm">Total Amount</p>
                    <h2 className="text-2xl print:text-base font-bold text-amber-500 print:text-black">
                        ₹{summary.totalAmount.toLocaleString("en-IN")}
                    </h2>
                </Card>

                <Card className="p-4 print:p-2 text-center border-l-4 border-l-blue-900 print:shadow-none print:border">
                    <p className="text-slate-500 font-medium text-xs sm:text-sm">Cash</p>
                    <h2 className="text-xl print:text-base font-bold text-blue-950 print:text-black">
                        ₹{summary.cashAmount.toLocaleString("en-IN")}
                    </h2>
                </Card>

                <Card className="p-4 print:p-2 text-center border-l-4 border-l-slate-700 print:shadow-none print:border">
                    <p className="text-slate-500 font-medium text-xs sm:text-sm">Bank</p>
                    <h2 className="text-xl print:text-base font-bold text-slate-700 print:text-black">
                        ₹{summary.bankAmount.toLocaleString("en-IN")}
                    </h2>
                </Card>
            </div>

            {/* ================= TABLE ================= */}
            <Card className="p-4 print:p-0 overflow-x-auto shadow-sm print:shadow-none print:border-none">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <p className="text-amber-500 font-medium animate-pulse">Loading Report Data...</p>
                    </div>
                ) : approvedRecords.length ? (
                    <table className="w-full border-collapse text-left text-sm print:text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-white border-b border-slate-800 print:bg-slate-100 print:text-black">
                                <th className="p-3 print:p-1 rounded-tl-md">Code</th>
                                <th className="p-3 print:p-1">Date</th>
                                <th className="p-3 print:p-1">Type</th>
                                <th className="p-3 print:p-1">Amount</th>
                                <th className="p-3 print:p-1">Mode</th>
                                <th className="p-3 print:p-1">Entered By</th>
                                <th className="p-3 print:hidden text-center rounded-tr-md">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {approvedRecords.map((item) => (
                                <tr
                                    key={item._id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors print:hover:bg-transparent"
                                >
                                    {/* Voucher / Credit Code */}
                                    <td className="p-3 print:p-1 font-mono font-bold text-amber-700 print:text-black text-xs">
                                        {(item).code || "-"}
                                    </td>

                                    {/* Date */}
                                    <td className="p-3 print:p-1 text-slate-600 print:text-black">
                                        {item.date ? new Date(item.date).toLocaleDateString("en-IN") : "-"}
                                    </td>

                                    {/* Type / Title */}
                                    <td className="p-3 print:p-1 font-medium text-slate-900 print:text-black">
                                        {item.title}
                                    </td>

                                    {/* Amount */}
                                    <td className="p-3 print:p-1 font-semibold text-amber-600 print:text-black">
                                        ₹ {Number(item.amount || 0).toLocaleString("en-IN")}
                                    </td>

                                    {/* Mode */}
                                    <td className="p-3 print:p-1">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-semibold print:p-0 print:text-xs print:font-normal ${item.mode === "Cash"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-slate-200 text-slate-800"
                                                }`}
                                        >
                                            {item.mode}
                                        </span>
                                    </td>

                                    {/* Entered By */}
                                    <td className="p-3 print:p-1 text-slate-600 print:text-black">
                                        {item.employee?.name || "N/A"}
                                    </td>

                                    {/* Action */}
                                    <td className="p-3 print:hidden text-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-slate-300 text-slate-700 hover:bg-slate-100"
                                            onClick={() => router.push(`/dashboard/credit/${item._id}`)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-center text-slate-500 p-8">
                        No approved credits found for the selected filters.
                    </p>
                )}
            </Card>

            {/* ================= ACTION BUTTONS ================= */}
            <div className="flex justify-end gap-3 pt-4 print:hidden">
                <Button
                    variant="outline"
                    className="border-slate-800 text-slate-900 hover:bg-slate-100 font-semibold"
                    disabled={!approvedRecords.length}
                    onClick={handlePrint}
                >
                    Print Report
                </Button>

                <Button
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-sm"
                    disabled={!approvedRecords.length}
                    onClick={exportExcel}
                >
                    Export Excel
                </Button>

                <Button
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                    disabled={!approvedRecords.length}
                    onClick={exportPDF}
                >
                    Export PDF
                </Button>
            </div>
        </section>
    );
}