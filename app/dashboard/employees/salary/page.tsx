"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Coins,
    Calculator,
    FileSpreadsheet,
    History,
    Search,
    Users,
    Wallet,
    ArrowUpRight,
    Printer,
    Trash2,
    ShieldAlert,
    ExternalLink,
} from "lucide-react";
import PayslipModal, { PayslipData } from "@/components/PayslipModal";
import { formatNumberINR } from "@/lib/payroll";

interface Branch {
    _id: string;
    name: string;
    code: string;
}

interface EmployeeItem {
    _id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    phone?: string;
    basicSalary?: number;
    accumulatedStaffDeposit?: number;
    remainingLeave?: number;
    branch?: Branch | null;
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

export default function SalaryDashboardPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<EmployeeItem[]>([]);
    const [recentSlips, setRecentSlips] = useState<SalaryRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("ALL");
    const [branches, setBranches] = useState<Branch[]>([]);

    // Payslip Modal
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);
    const [selectedSlip, setSelectedSlip] = useState<PayslipData | null>(null);

    const isAdmin = session?.user?.role === "ADMINISTRATOR";

    /* ================= LOAD INITIAL DATA ================= */
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                const [empRes, slipsRes, branchRes] = await Promise.all([
                    fetch("/api/employees/list").then((r) => r.json()),
                    fetch("/api/salary/list?limit=15").then((r) => r.json()),
                    fetch("/api/branches/list").then((r) => r.json()),
                ]);

                if (isMounted) {
                    if (empRes.success) setEmployees(empRes.employees || []);
                    if (slipsRes.success) setRecentSlips(slipsRes.salaries || []);
                    if (branchRes.success) setBranches(branchRes.branches || []);
                }
            } catch (err) {
                console.error("Salary dashboard load error:", err);
                if (isMounted) toast.error("Failed to load payroll data");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (authStatus === "authenticated") {
            loadData();
        }
        return () => {
            isMounted = false;
        };
    }, [authStatus]);

    /* ================= STATS COMPUTATION ================= */
    const stats = useMemo(() => {
        const totalEmployees = employees.length;
        const totalSlips = recentSlips.length;
        const totalNetPaid = recentSlips.reduce((sum, s) => sum + (s.netSalary || 0), 0);
        const totalStaffDeposit = employees.reduce(
            (sum, e) => sum + (e.accumulatedStaffDeposit || 0),
            0
        );

        return {
            totalEmployees,
            totalSlips,
            totalNetPaid,
            totalStaffDeposit,
        };
    }, [employees, recentSlips]);

    /* ================= FILTERED EMPLOYEES ================= */
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const matchesSearch =
                !searchQuery.trim() ||
                emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.designation?.toLowerCase().includes(searchQuery.toLowerCase());

            const branchId = emp.branch?._id || "";
            const matchesBranch =
                selectedBranch === "ALL" || branchId === selectedBranch;

            return matchesSearch && matchesBranch;
        });
    }, [employees, searchQuery, selectedBranch]);

    /* ================= DELETE SLIP ================= */
    const handleDeleteSlip = async (id: string, slipId: string) => {
        if (!confirm(`Are you sure you want to delete salary slip #${slipId}?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/salary/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                toast.success(`Salary slip #${slipId} deleted`);
                setRecentSlips((prev) => prev.filter((s) => s._id !== id));
            } else {
                toast.error(data.error || "Failed to delete slip");
            }
        } catch {
            toast.error("Error deleting salary slip");
        }
    };

    const openPayslip = (slip: SalaryRecord) => {
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

    if (authStatus === "loading" || loading) {
        return <LoadingOverlay show={true} />;
    }

    if (!isAdmin) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <PageHeader />
                <Card className="border-amber-200 bg-amber-50 p-8 text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
                    <h2 className="text-xl font-bold text-slate-900">
                        Administrator Access Only
                    </h2>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                        Staff payroll, salary calculations, and master register access are restricted to company administrators.
                    </p>
                    <Button
                        onClick={() => router.push("/dashboard/profile")}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold"
                    >
                        View My Personal Payslips
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
            <PageHeader />

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                            <Coins className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                Staff Salary & Payroll Management
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                                Issue official monthly payslips, manage staff compensation rates, and view salary registers
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                        onClick={() => router.push("/dashboard/employees/salary/calculator")}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-sm rounded-xl cursor-pointer"
                    >
                        <Calculator className="w-4 h-4" />
                        <span>Issue Salary Slip</span>
                    </Button>

                    <Button
                        onClick={() => router.push("/dashboard/employees/salary/sheet")}
                        variant="outline"
                        className="border-slate-300 hover:bg-slate-100 font-semibold gap-2 rounded-xl cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Master Salary Sheet</span>
                    </Button>

                    <Button
                        onClick={() => router.push("/dashboard/employees/salary/history")}
                        variant="outline"
                        className="border-slate-300 hover:bg-slate-100 font-semibold gap-2 rounded-xl cursor-pointer"
                    >
                        <History className="w-4 h-4 text-blue-600" />
                        <span>All Slips History</span>
                    </Button>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Active Staff Members
                        </span>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 mt-2">
                        {stats.totalEmployees}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Configured in system</p>
                </Card>

                <Card className="p-5 border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Recent Slips Issued
                        </span>
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                            <Calculator className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 mt-2">
                        {stats.totalSlips}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Stored official vouchers</p>
                </Card>

                <Card className="p-5 border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Recent Net Disbursed
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-emerald-700 mt-2">
                        ₹{formatNumberINR(stats.totalNetPaid)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">From recent slips</p>
                </Card>

                <Card className="p-5 border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Total Staff Deposit
                        </span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                            <Coins className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-amber-700 mt-2">
                        ₹{formatNumberINR(stats.totalStaffDeposit)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Accumulated staff savings</p>
                </Card>
            </div>

            {/* Staff Directory for Salary Actions */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span>Employee Salary Directory</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                                {filteredEmployees.length}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500">
                            Select an employee to calculate their salary or configure basic compensation rates
                        </p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search staff name / code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white rounded-xl text-sm h-9"
                            />
                        </div>

                        {branches.length > 0 && (
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                            >
                                <option value="ALL">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <Card className="overflow-hidden border-slate-200 shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">S.No</th>
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Designation</th>
                                    <th className="py-3 px-4">Branch</th>
                                    <th className="py-3 px-4 text-right">Basic Salary</th>
                                    <th className="py-3 px-4 text-right">Staff Deposit</th>
                                    <th className="py-3 px-4 text-right">Remaining Leaves</th>
                                    <th className="py-3 px-4 text-center">Payroll Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                                            No employees found matching the filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp, idx) => (
                                        <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 text-slate-500 text-xs font-semibold">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">{emp.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {emp.employeeId || emp.email}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                                    {emp.designation || emp.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-medium text-slate-600">
                                                {emp.branch?.name || "Main Branch"}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-slate-900">
                                                ₹{formatNumberINR(emp.basicSalary || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-amber-700">
                                                ₹{formatNumberINR(emp.accumulatedStaffDeposit || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-slate-700">
                                                {emp.remainingLeave ?? 0} days
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/employees/salary/calculator?employeeId=${emp._id}`
                                                            )
                                                        }
                                                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-2.5 rounded-lg cursor-pointer shadow-2xs"
                                                    >
                                                        <Calculator className="w-3.5 h-3.5" />
                                                        <span>Calculate</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/employees/salary/history?employeeId=${emp._id}`
                                                            )
                                                        }
                                                        className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs h-8 px-2.5 rounded-lg cursor-pointer"
                                                    >
                                                        <History className="w-3.5 h-3.5 text-blue-600" />
                                                        <span>Slips</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            router.push(`/dashboard/profile?id=${emp._id}`)
                                                        }
                                                        className="text-slate-500 hover:text-slate-900 text-xs h-8 px-2 rounded-lg cursor-pointer"
                                                        title="View & Edit HR Details"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Recent Salary Slips */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Recently Issued Salary Slips
                        </h2>
                        <p className="text-xs text-slate-500">
                            Latest generated compensation vouchers stored in company records
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/employees/salary/history")}
                        className="text-xs font-semibold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
                    >
                        <span>View All Slips</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <Card className="overflow-hidden border-slate-200 shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Slip ID</th>
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Pay Period</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4 text-right">Gross Earnings</th>
                                    <th className="py-3 px-4 text-right">Deductions</th>
                                    <th className="py-3 px-4 text-right">Net Salary</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentSlips.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-slate-500 text-sm">
                                            No salary slips have been generated yet
                                        </td>
                                    </tr>
                                ) : (
                                    recentSlips.map((slip) => (
                                        <tr key={slip._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-amber-700 text-xs">
                                                #{slip.slipId}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">
                                                    {slip.employeeName}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {slip.designation} &bull; {slip.branchName}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-slate-700">
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
                                                    PAID
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openPayslip(slip)}
                                                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs h-8 px-2.5 rounded-lg cursor-pointer shadow-2xs gap-1"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        <span>View Payslip</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteSlip(slip._id, slip.slipId)}
                                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 rounded-lg cursor-pointer"
                                                        title="Delete Slip"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Printable Payslip Modal */}
            <PayslipModal
                isOpen={payslipModalOpen}
                onClose={() => setPayslipModalOpen(false)}
                data={selectedSlip}
            />
        </div>
    );
}
