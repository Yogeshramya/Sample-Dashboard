"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    History,
    Search,
    Printer,
    Trash2,
    ArrowLeft,
    Plus,
    FileSpreadsheet,
} from "lucide-react";
import PayslipModal, { PayslipData } from "@/components/PayslipModal";
import { formatNumberINR } from "@/lib/payroll";

interface EmployeeItem {
    _id: string;
    name: string;
    employeeId?: string;
}

interface SalaryRecord {
    _id: string;
    slipId: string;
    employee: string | { _id: string; name: string };
    employeeName: string;
    employeeCode: string;
    designation: string;
    department: string;
    branchName: string;
    payPeriod: string;
    cycleStartDate: string;
    cycleEndDate: string;
    date: string;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    remainingLeave: number;
    dailySalary: number;
    basicSalary: { full: number; actual: number };
    hra: { full: number; actual: number };
    da: { full: number; actual: number };
    travellingAllowance: { full: number; actual: number };
    increment?: { full: number; actual: number };
    overtime?: { full: number; actual: number };
    bonus?: { full: number; actual: number };
    incentive?: { full: number; actual: number };
    totalEarnings: { full: number; actual: number };
    penalty: number;
    otherDeduction: number;
    providentFund: number;
    esi: number;
    professionalTax: number;
    advance: number;
    lop: number;
    personalLoan: number;
    staffDeposit: number;
    totalDeductions: number;
    netSalary: number;
    amountInWords: string;
    accumulatedStaffDeposit: number;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
    status: string;
    createdAt: string;
}

function SalaryHistoryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const employeeIdParam = searchParams.get("employeeId") || "";

    const [loading, setLoading] = useState(true);
    const [slips, setSlips] = useState<SalaryRecord[]>([]);
    const [employees, setEmployees] = useState<EmployeeItem[]>([]);

    // Filters
    const [selectedEmployee, setSelectedEmployee] = useState(employeeIdParam);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("ALL");

    // Modal
    const [selectedSlip, setSelectedSlip] = useState<PayslipData | null>(null);
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);

    const isAdmin = session?.user?.role === "ADMINISTRATOR";

    /* ================= LOAD INITIAL DATA ================= */
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                let url = "/api/salary/list";
                if (selectedEmployee && selectedEmployee !== "ALL") {
                    url += `?employeeId=${selectedEmployee}`;
                }

                const [slipsRes, empRes] = await Promise.all([
                    fetch(url).then((r) => r.json()),
                    fetch("/api/employees/list").then((r) => r.json()),
                ]);

                if (isMounted) {
                    if (slipsRes.success) setSlips(slipsRes.salaries || []);
                    if (empRes.success) setEmployees(empRes.employees || []);
                }
            } catch (err) {
                console.error("Salary history fetch error:", err);
                if (isMounted) toast.error("Failed to load salary slips");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();
        return () => {
            isMounted = false;
        };
    }, [selectedEmployee]);

    /* ================= PERIODS LIST ================= */
    const uniquePeriods = useMemo(() => {
        const set = new Set<string>();
        slips.forEach((s) => {
            if (s.payPeriod) set.add(s.payPeriod);
        });
        return Array.from(set);
    }, [slips]);

    /* ================= FILTERED SLIPS ================= */
    const filteredSlips = useMemo(() => {
        return slips.filter((s) => {
            const matchesSearch =
                !searchQuery.trim() ||
                s.slipId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.branchName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesPeriod =
                selectedPeriod === "ALL" || s.payPeriod === selectedPeriod;

            return matchesSearch && matchesPeriod;
        });
    }, [slips, searchQuery, selectedPeriod]);

    /* ================= TOTAL NET OF FILTERED ================= */
    const totalFilteredNet = useMemo(() => {
        return filteredSlips.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    }, [filteredSlips]);

    /* ================= DELETE SLIP ================= */
    const handleDeleteSlip = async (id: string, slipId: string) => {
        if (!confirm(`Are you sure you want to delete salary slip #${slipId}? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/salary/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                toast.success(`Salary slip #${slipId} successfully deleted`);
                setSlips((prev) => prev.filter((s) => s._id !== id));
            } else {
                toast.error(data.error || "Failed to delete salary slip");
            }
        } catch {
            toast.error("Error deleting salary slip");
        }
    };

    const handleOpenSlip = (slip: SalaryRecord) => {
        setSelectedSlip({
            _id: slip._id,
            slipId: slip.slipId,
            employeeName: slip.employeeName,
            employeeCode: slip.employeeCode,
            designation: slip.designation,
            department: slip.department,
            branchName: slip.branchName,
            workingDays: slip.workingDays,
            presentDays: slip.presentDays,
            leaveDays: slip.leaveDays,
            absentDays: slip.absentDays,
            payPeriod: slip.payPeriod,
            remainingLeave: slip.remainingLeave,
            accumulatedStaffDeposit: slip.accumulatedStaffDeposit,
            basicSalary: slip.basicSalary || { full: 0, actual: 0 },
            hra: slip.hra || { full: 0, actual: 0 },
            da: slip.da || { full: 0, actual: 0 },
            travellingAllowance: slip.travellingAllowance || { full: 0, actual: 0 },
            increment: slip.increment,
            overtime: slip.overtime,
            bonus: slip.bonus,
            incentive: slip.incentive,
            totalEarnings: slip.totalEarnings || { full: 0, actual: 0 },
            penalty: slip.penalty,
            otherDeduction: slip.otherDeduction,
            providentFund: slip.providentFund || 0,
            esi: slip.esi || 0,
            professionalTax: slip.professionalTax,
            advance: slip.advance,
            lop: slip.lop || 0,
            personalLoan: slip.personalLoan,
            staffDeposit: slip.staffDeposit || 500,
            totalDeductions: slip.totalDeductions || 0,
            netSalary: slip.netSalary || 0,
            amountInWords: slip.amountInWords || "",
        });
        setPayslipModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader />

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                            <span>Salary Slips Archive & History</span>
                            <History className="w-5 h-5 text-blue-600" />
                        </h1>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Search, preview, and print official salary vouchers generated for employees
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/employees/salary/sheet")}
                        className="rounded-xl text-xs font-semibold border-slate-300 gap-1.5"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Master Register</span>
                    </Button>

                    {isAdmin && (
                        <Button
                            size="sm"
                            onClick={() => router.push("/dashboard/employees/salary/calculator")}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl gap-1 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Issue New Slip</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Search */}
                    <div className="sm:col-span-5 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search by Slip ID, Staff Name, or Code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Employee Filter */}
                    <div className="sm:col-span-4">
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                        >
                            <option value="ALL">All Staff Members</option>
                            {employees.map((e) => (
                                <option key={e._id} value={e._id}>
                                    {e.name} ({e.employeeId || "Staff"})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Period Filter */}
                    <div className="sm:col-span-3">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                        >
                            <option value="ALL">All Pay Periods</option>
                            {uniquePeriods.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Total Filter Summary */}
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span>
                    Showing <strong className="text-slate-900">{filteredSlips.length}</strong> vouchers
                </span>
                <span>
                    Total Net Disbursed:{" "}
                    <strong className="text-emerald-700 font-mono text-sm">
                        ₹{formatNumberINR(totalFilteredNet)}
                    </strong>
                </span>
            </div>

            {/* Slips Table */}
            <Card className="overflow-hidden border-slate-200 shadow-xs">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                            Loading salary vouchers...
                        </div>
                    ) : filteredSlips.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">
                            No salary slips match your filter criteria
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Slip ID</th>
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Pay Period</th>
                                    <th className="py-3 px-4">Issue Date</th>
                                    <th className="py-3 px-4 text-right">Gross Salary</th>
                                    <th className="py-3 px-4 text-right">Deductions</th>
                                    <th className="py-3 px-4 text-right">Net Payout</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSlips.map((slip) => (
                                    <tr key={slip._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-amber-700 text-xs">
                                            #{slip.slipId}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900">{slip.employeeName}</div>
                                            <div className="text-xs text-slate-500">
                                                {slip.employeeCode} &bull; {slip.branchName}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">
                                            {slip.payPeriod}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-600">
                                            {slip.date}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                                            ₹{formatNumberINR(slip.totalEarnings?.full || slip.totalEarnings?.actual || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-rose-600">
                                            -₹{formatNumberINR(slip.totalDeductions || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-emerald-700 text-base">
                                            ₹{formatNumberINR(slip.netSalary || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                {slip.status || "PAID"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenSlip(slip)}
                                                    className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs h-8 px-2.5 rounded-lg cursor-pointer shadow-2xs gap-1"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>Payslip</span>
                                                </Button>

                                                {isAdmin && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteSlip(slip._id, slip.slipId)}
                                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 rounded-lg cursor-pointer"
                                                        title="Delete Slip"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Payslip Modal */}
            <PayslipModal
                isOpen={payslipModalOpen}
                onClose={() => setPayslipModalOpen(false)}
                data={selectedSlip}
            />
        </div>
    );
}

export default function SalaryHistoryPage() {
    return (
        <Suspense fallback={<LoadingOverlay show={true} />}>
            <SalaryHistoryContent />
        </Suspense>
    );
}
