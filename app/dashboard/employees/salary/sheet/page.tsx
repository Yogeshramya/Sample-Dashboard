"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    FileSpreadsheet,
    Printer,
    Download,
    Calendar,
    ArrowLeft,
    RefreshCw,
    Plus,
} from "lucide-react";
import PayslipModal, { PayslipData } from "@/components/PayslipModal";
import { formatNumberINR } from "@/lib/payroll";

interface SheetRow {
    _id: string;
    slipId: string;
    employeeName: string;
    employeeId: string;
    designation: string;
    salaryPeriod: string;
    monthlyGrossSalary: number;
    totalDays: number;
    presentDays: number;
    lopDays: number;
    dailySalary: number;
    leaveDeduction: number;
    salaryAdvance: number;
    staffDeposit: number;
    totalDeduction: number;
    netSalaryPayable: number;
}

interface SheetTotals {
    totalGross: number;
    totalLeaveDeduction: number;
    totalSalaryAdvance: number;
    totalStaffDeposit: number;
    totalDeductions: number;
    totalNetPayable: number;
}

export default function SalarySheetPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [payPeriod, setPayPeriod] = useState(() => {
        const now = new Date();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    });

    const [rows, setRows] = useState<SheetRow[]>([]);
    const [totals, setTotals] = useState<SheetTotals>({
        totalGross: 0,
        totalLeaveDeduction: 0,
        totalSalaryAdvance: 0,
        totalStaffDeposit: 0,
        totalDeductions: 0,
        totalNetPayable: 0,
    });
    const [signatories, setSignatories] = useState({
        preparedBy: "SARANYA",
        checkedBy: "NANDHINI",
        approvedBy: "VIGNESH",
    });

    // Payslip modal for row preview
    const [selectedSlip, setSelectedSlip] = useState<PayslipData | null>(null);
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);

    /* ================= FETCH SHEET ASYNC ================= */
    useEffect(() => {
        let isMounted = true;
        fetch(`/api/salary/sheet?payPeriod=${encodeURIComponent(payPeriod)}`)
            .then((r) => r.json())
            .then((data) => {
                if (isMounted) {
                    if (data.success) {
                        setRows(data.rows || []);
                        if (data.totals) setTotals(data.totals);
                        if (data.preparedBy) {
                            setSignatories({
                                preparedBy: data.preparedBy,
                                checkedBy: data.checkedBy,
                                approvedBy: data.approvedBy,
                            });
                        }
                    } else {
                        setRows([]);
                    }
                }
            })
            .catch((err) => {
                console.error("Salary sheet fetch error:", err);
                if (isMounted) toast.error("Error loading master salary sheet");
            });

        return () => {
            isMounted = false;
        };
    }, [payPeriod]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/salary/sheet?payPeriod=${encodeURIComponent(payPeriod)}`);
            const data = await res.json();
            if (data.success) {
                setRows(data.rows || []);
                if (data.totals) setTotals(data.totals);
                if (data.preparedBy) {
                    setSignatories({
                        preparedBy: data.preparedBy,
                        checkedBy: data.checkedBy,
                        approvedBy: data.approvedBy,
                    });
                }
                toast.success("Register refreshed");
            } else {
                toast.error(data.error || "Failed to load sheet");
            }
        } catch {
            toast.error("Error refreshing sheet");
        } finally {
            setLoading(false);
        }
    };

    /* ================= VIEW SLIP ================= */
    const handleViewSlip = async (id: string) => {
        try {
            const res = await fetch(`/api/salary/${id}`);
            const data = await res.json();
            if (data.success && data.salary) {
                setSelectedSlip(data.salary);
                setPayslipModalOpen(true);
            } else {
                toast.error("Could not fetch slip details");
            }
        } catch {
            toast.error("Error opening slip");
        }
    };

    /* ================= CSV EXPORT ================= */
    const handleExportCSV = () => {
        if (rows.length === 0) {
            toast.error("No rows to export");
            return;
        }

        const headers = [
            "S.No",
            "Slip ID",
            "Employee Name",
            "Employee ID",
            "Designation",
            "Salary Period",
            "Monthly Gross Salary",
            "Total Days",
            "Present Days",
            "LOP Days",
            "Daily Salary",
            "Leave Deduction",
            "Salary Advance",
            "Staff Deposit",
            "Total Deduction",
            "Net Salary Payable",
        ];

        const csvRows = rows.map((r, i) => [
            i + 1,
            `"${r.slipId}"`,
            `"${r.employeeName}"`,
            `"${r.employeeId}"`,
            `"${r.designation}"`,
            `"${r.salaryPeriod}"`,
            r.monthlyGrossSalary,
            r.totalDays,
            r.presentDays,
            r.lopDays,
            r.dailySalary,
            r.leaveDeduction,
            r.salaryAdvance,
            r.staffDeposit,
            r.totalDeduction,
            r.netSalaryPayable,
        ]);

        // Append total row
        csvRows.push([
            "",
            "TOTALS",
            "",
            "",
            "",
            "",
            totals.totalGross,
            "",
            "",
            "",
            "",
            totals.totalLeaveDeduction,
            totals.totalSalaryAdvance,
            totals.totalStaffDeposit,
            totals.totalDeductions,
            totals.totalNetPayable,
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
            "download",
            `Master_Salary_Sheet_${payPeriod.replace(/\s+/g, "_")}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader />

            {/* Header Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/employees/salary")}
                        className="rounded-xl border border-slate-200 hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span>Master Salary Register & Sheet</span>
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        </h1>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Official company consolidated monthly compensation sheet for staff and audit compliance
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <Input
                            value={payPeriod}
                            onChange={(e) => setPayPeriod(e.target.value)}
                            placeholder="e.g. October 2026"
                            className="h-8 border-none shadow-none text-xs font-semibold focus-visible:ring-0 p-0 w-32"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={handleRefresh}
                        className="rounded-xl text-xs font-semibold border-slate-300 gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="rounded-xl text-xs font-semibold border-slate-300 gap-1.5 text-slate-700 hover:bg-slate-100"
                    >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => window.print()}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl gap-1.5 shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Print Sheet</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => router.push("/dashboard/employees/salary/calculator")}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl gap-1 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Slip</span>
                    </Button>
                </div>
            </div>

            {/* Summary Cards (Hidden on Print) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
                <Card className="p-3 bg-white border-slate-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                        Monthly Gross
                    </span>
                    <p className="text-lg font-black text-slate-900 mt-1">
                        ₹{formatNumberINR(totals.totalGross)}
                    </p>
                </Card>

                <Card className="p-3 bg-white border-slate-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                        Leave / LOP Ded.
                    </span>
                    <p className="text-lg font-black text-rose-600 mt-1">
                        ₹{formatNumberINR(totals.totalLeaveDeduction)}
                    </p>
                </Card>

                <Card className="p-3 bg-white border-slate-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                        Salary Advances
                    </span>
                    <p className="text-lg font-black text-slate-800 mt-1">
                        ₹{formatNumberINR(totals.totalSalaryAdvance)}
                    </p>
                </Card>

                <Card className="p-3 bg-white border-slate-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                        Staff Deposit
                    </span>
                    <p className="text-lg font-black text-amber-700 mt-1">
                        ₹{formatNumberINR(totals.totalStaffDeposit)}
                    </p>
                </Card>

                <Card className="p-3 bg-white border-slate-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                        Total Deductions
                    </span>
                    <p className="text-lg font-black text-rose-700 mt-1">
                        ₹{formatNumberINR(totals.totalDeductions)}
                    </p>
                </Card>

                <Card className="p-3 bg-emerald-50 border-emerald-300">
                    <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
                        Net Payable
                    </span>
                    <p className="text-lg font-black text-emerald-800 mt-1">
                        ₹{formatNumberINR(totals.totalNetPayable)}
                    </p>
                </Card>
            </div>

            {/* Printable Document Sheet */}
            <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
                {/* Official Title Block for Print and Screen */}
                <div className="text-center pb-6 border-b border-slate-200 mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-wide">
                        SAMPLE PRIME SMALL FINANCE PVT LTD
                    </h2>
                    <p className="text-xs font-bold text-slate-600 tracking-widest uppercase mt-0.5">
                        CONSOLIDATED STAFF SALARY REGISTER &mdash; {payPeriod}
                    </p>
                    <div className="flex items-center justify-center gap-6 text-xs text-slate-500 mt-2 font-medium">
                        <span>Total Records: {rows.length} Staff</span>
                        <span>&bull;</span>
                        <span>Currency: Indian Rupees (INR)</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                            Loading master salary register...
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">
                            No salary slips issued for {payPeriod} yet.
                        </div>
                    ) : (
                        <table className="w-full text-xs text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider border-b border-slate-300">
                                <tr>
                                    <th className="p-2 border border-slate-300 text-center">S.No</th>
                                    <th className="p-2 border border-slate-300">Slip ID</th>
                                    <th className="p-2 border border-slate-300">Employee Name</th>
                                    <th className="p-2 border border-slate-300">Emp ID</th>
                                    <th className="p-2 border border-slate-300">Designation</th>
                                    <th className="p-2 border border-slate-300 text-right">Gross Salary</th>
                                    <th className="p-2 border border-slate-300 text-center">Days</th>
                                    <th className="p-2 border border-slate-300 text-center">Present</th>
                                    <th className="p-2 border border-slate-300 text-center">LOP</th>
                                    <th className="p-2 border border-slate-300 text-right">Daily Rate</th>
                                    <th className="p-2 border border-slate-300 text-right">Leave Ded.</th>
                                    <th className="p-2 border border-slate-300 text-right">Advance</th>
                                    <th className="p-2 border border-slate-300 text-right">Staff Dep.</th>
                                    <th className="p-2 border border-slate-300 text-right">Total Ded.</th>
                                    <th className="p-2 border border-slate-300 text-right bg-emerald-50 text-emerald-950">Net Payable</th>
                                    <th className="p-2 border border-slate-300 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {rows.map((row, index) => (
                                    <tr key={row._id} className="hover:bg-slate-50/80">
                                        <td className="p-2 border border-slate-300 text-center text-slate-500">
                                            {index + 1}
                                        </td>
                                        <td className="p-2 border border-slate-300 font-mono font-bold text-amber-700">
                                            #{row.slipId}
                                        </td>
                                        <td className="p-2 border border-slate-300 font-bold text-slate-900">
                                            {row.employeeName}
                                        </td>
                                        <td className="p-2 border border-slate-300 font-mono text-slate-600">
                                            {row.employeeId}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-slate-700">
                                            {row.designation}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right font-medium">
                                            {formatNumberINR(row.monthlyGrossSalary)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center">
                                            {row.totalDays}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center font-bold text-emerald-700">
                                            <span>{row.presentDays}</span>
                                            {row.presentDays % 1 !== 0 && (
                                                <span className="ml-1 text-3xs font-extrabold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded print:hidden">
                                                    ½ day
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center font-bold text-rose-600">
                                            <span>{row.lopDays}</span>
                                            {row.lopDays % 1 !== 0 && (
                                                <span className="ml-1 text-3xs font-extrabold text-rose-800 bg-rose-100 px-1 py-0.5 rounded print:hidden">
                                                    ½ day
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right font-mono text-slate-600">
                                            {formatNumberINR(row.dailySalary)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right text-rose-600 font-medium">
                                            {formatNumberINR(row.leaveDeduction)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right text-slate-700 font-medium">
                                            {formatNumberINR(row.salaryAdvance)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right text-amber-700 font-medium">
                                            {formatNumberINR(row.staffDeposit)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right text-rose-700 font-bold">
                                            {formatNumberINR(row.totalDeduction)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-right font-black text-emerald-800 bg-emerald-50/50">
                                            ₹{formatNumberINR(row.netSalaryPayable)}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center print:hidden">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleViewSlip(row._id)}
                                                className="h-7 px-2 text-2xs font-bold text-blue-600 hover:text-blue-800"
                                            >
                                                View Slip
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Summary Footer */}
                            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                                <tr>
                                    <td colSpan={5} className="p-2.5 border border-slate-300 text-center uppercase tracking-wider">
                                        Grand Totals ({rows.length} Staff)
                                    </td>
                                    <td className="p-2.5 border border-slate-300 text-right font-mono">
                                        ₹{formatNumberINR(totals.totalGross)}
                                    </td>
                                    <td colSpan={4} className="p-2.5 border border-slate-300"></td>
                                    <td className="p-2.5 border border-slate-300 text-right text-rose-700 font-mono">
                                        ₹{formatNumberINR(totals.totalLeaveDeduction)}
                                    </td>
                                    <td className="p-2.5 border border-slate-300 text-right font-mono">
                                        ₹{formatNumberINR(totals.totalSalaryAdvance)}
                                    </td>
                                    <td className="p-2.5 border border-slate-300 text-right text-amber-700 font-mono">
                                        ₹{formatNumberINR(totals.totalStaffDeposit)}
                                    </td>
                                    <td className="p-2.5 border border-slate-300 text-right text-rose-800 font-mono">
                                        ₹{formatNumberINR(totals.totalDeductions)}
                                    </td>
                                    <td className="p-2.5 border border-slate-300 text-right text-emerald-800 bg-emerald-100 font-mono text-sm">
                                        ₹{formatNumberINR(totals.totalNetPayable)}
                                    </td>
                                    <td className="p-2.5 border border-slate-300 print:hidden"></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Audit & Signature Block */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-8 border-t border-slate-200 text-center text-xs">
                    <div>
                        <div className="border-b border-black w-40 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">
                            {signatories.preparedBy}
                        </span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">
                            Prepared By
                        </p>
                    </div>

                    <div>
                        <div className="border-b border-black w-40 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">
                            {signatories.checkedBy}
                        </span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">
                            Checked By
                        </p>
                    </div>

                    <div>
                        <div className="border-b border-black w-40 mx-auto mb-2" />
                        <span className="font-bold text-slate-900 uppercase">
                            {signatories.approvedBy}
                        </span>
                        <p className="text-2xs text-slate-500 uppercase tracking-wider">
                            Approved By / Director
                        </p>
                    </div>
                </div>
            </div>

            {/* Payslip Modal */}
            <PayslipModal
                isOpen={payslipModalOpen}
                onClose={() => setPayslipModalOpen(false)}
                data={selectedSlip}
            />
        </div>
    );
}
