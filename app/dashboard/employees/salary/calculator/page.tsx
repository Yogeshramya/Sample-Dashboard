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
    Coins,
    Calendar,
    ArrowLeft,
    Printer,
    Percent,
    FileSpreadsheet,
    History,
    Sparkles,
} from "lucide-react";
import PayslipModal, { PayslipData } from "@/components/PayslipModal";
import { calculatePayroll, formatNumberINR } from "@/lib/payroll";

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
    fatherName?: string;
    designation?: string;
    department?: string;
    phone?: string;
    bankName?: string;
    bankAccountNo?: string;
    panNo?: string;
    pfNo?: string;
    esiNo?: string;
    basicSalary?: number;
    hra?: number;
    da?: number;
    travellingAllowance?: number;
    accumulatedStaffDeposit?: number;
    remainingLeave?: number;
    branch?: Branch | null;
}

function getDefaultPayPeriod(): string {
    const now = new Date();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function parseDaysInput(val: string | number | undefined | null): number {
    if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, val);
    if (!val) return 0;
    const str = String(val).trim();
    if (str === "" || str === ".") return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.max(0, num);
}

function SalaryCalculatorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status: authStatus } = useSession();

    const employeeIdParam = searchParams.get("employeeId");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [employees, setEmployees] = useState<EmployeeItem[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    // Modal state for viewing generated slip
    const [generatedSlip, setGeneratedSlip] = useState<PayslipData | null>(null);
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);

    // Form State
    const [form, setForm] = useState(() => ({
        payPeriod: getDefaultPayPeriod(),
        date: new Date().toLocaleDateString("en-GB"), // DD/MM/YYYY
        cycleStartDate: "",
        cycleEndDate: "",
        workingDays: "30",
        presentDays: "30",
        leaveDays: "0",
        absentDays: "0",
        remainingLeave: "0",

        // Earnings
        basic: "12000",
        hra: "0",
        da: "0",
        travelling: "0",
        increment: "0",
        overtime: "0",
        bonus: "0",
        incentive: "0",

        // Deductions
        includePF: true,
        pfAmount: "",
        includeESI: true,
        esiAmount: "",
        staffDeposit: "500",
        advance: "0",
        penalty: "0",
        personalLoan: "0",
        professionalTax: "0",
        otherDeductions: "0",

        // Authorizations
        preparedBy: "SARANYA",
        checkedBy: "NANDHINI",
        approvedBy: "VIGNESH",
        customSlipId: "",
        notes: "",
    }));

    /* ================= LOAD EMPLOYEES ================= */
    useEffect(() => {
        let isMounted = true;
        async function loadEmployees() {
            try {
                const res = await fetch("/api/employees/list");
                const data = await res.json();
                if (isMounted && data.success) {
                    const list: EmployeeItem[] = data.employees || [];
                    setEmployees(list);

                    // Pick selected employee from param or first in list
                    const targetId =
                        employeeIdParam && list.some((e) => e._id === employeeIdParam)
                            ? employeeIdParam
                            : list[0]?._id || "";

                    setSelectedEmployeeId(targetId);

                    const targetEmp = list.find((e) => e._id === targetId);
                    if (targetEmp) {
                        setForm((prev) => ({
                            ...prev,
                            basic: targetEmp.basicSalary ? String(targetEmp.basicSalary) : "12000",
                            hra: targetEmp.hra ? String(targetEmp.hra) : "0",
                            da: targetEmp.da ? String(targetEmp.da) : "0",
                            travelling: targetEmp.travellingAllowance
                                ? String(targetEmp.travellingAllowance)
                                : "0",
                            remainingLeave: targetEmp.remainingLeave
                                ? String(targetEmp.remainingLeave)
                                : "0",
                        }));
                    }
                }
            } catch (err) {
                console.error("Employee list fetch error:", err);
                if (isMounted) toast.error("Failed to load employee list");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (authStatus === "authenticated") {
            loadEmployees();
        }
        return () => {
            isMounted = false;
        };
    }, [authStatus, employeeIdParam]);

    const handleEmployeeChange = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find((e) => e._id === empId);
        if (emp) {
            setForm((prev) => ({
                ...prev,
                basic: emp.basicSalary ? String(emp.basicSalary) : "12000",
                hra: emp.hra ? String(emp.hra) : "0",
                da: emp.da ? String(emp.da) : "0",
                travelling: emp.travellingAllowance
                    ? String(emp.travellingAllowance)
                    : "0",
                remainingLeave: emp.remainingLeave
                    ? String(emp.remainingLeave)
                    : "0",
            }));
        }
    };

    const currentEmployee = useMemo(() => {
        return employees.find((e) => e._id === selectedEmployeeId) || null;
    }, [employees, selectedEmployeeId]);

    /* ================= ATTENDANCE & HALF-DAY HANDLERS ================= */
    const handleWorkingDaysChange = (val: string) => {
        if (val === "" || val === ".") {
            setForm((prev) => ({ ...prev, workingDays: val }));
            return;
        }
        const wDays = parseDaysInput(val);
        const aDays = parseDaysInput(form.absentDays);
        const lDays = parseDaysInput(form.leaveDays);
        const newPresent = Math.max(0, Math.round((wDays - aDays - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            workingDays: val,
            presentDays: String(newPresent),
        }));
    };

    const handleWorkingDaysBlur = () => {
        setForm((prev) => {
            const str = prev.workingDays.trim();
            if (str === "" || str === "." || parseDaysInput(str) <= 0) {
                return { ...prev, workingDays: "30" };
            }
            if (str.startsWith(".")) {
                return { ...prev, workingDays: "0" + str };
            }
            return prev;
        });
    };

    const handlePresentDaysChange = (val: string) => {
        if (val === "" || val === ".") {
            setForm((prev) => ({ ...prev, presentDays: val }));
            return;
        }
        const pDays = parseDaysInput(val);
        const wDays = parseDaysInput(form.workingDays) || 30;
        const lDays = parseDaysInput(form.leaveDays);
        const newAbsent = Math.max(0, Math.round((wDays - pDays - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            presentDays: val,
            absentDays: String(newAbsent),
        }));
    };

    const handlePresentDaysBlur = () => {
        setForm((prev) => {
            const str = prev.presentDays.trim();
            if (str === "" || str === ".") {
                const wDays = parseDaysInput(prev.workingDays) || 30;
                const aDays = parseDaysInput(prev.absentDays);
                const lDays = parseDaysInput(prev.leaveDays);
                const fallback = Math.max(0, Math.round((wDays - aDays - lDays) * 10) / 10);
                return { ...prev, presentDays: String(fallback) };
            }
            if (str.startsWith(".")) {
                return { ...prev, presentDays: "0" + str };
            }
            return prev;
        });
    };

    const handleAbsentDaysChange = (val: string) => {
        if (val === "" || val === ".") {
            setForm((prev) => ({ ...prev, absentDays: val }));
            return;
        }
        const aDays = parseDaysInput(val);
        const wDays = parseDaysInput(form.workingDays) || 30;
        const lDays = parseDaysInput(form.leaveDays);
        const newPresent = Math.max(0, Math.round((wDays - aDays - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            absentDays: val,
            presentDays: String(newPresent),
        }));
    };

    const handleAbsentDaysBlur = () => {
        setForm((prev) => {
            const str = prev.absentDays.trim();
            if (str === "" || str === ".") {
                return { ...prev, absentDays: "0" };
            }
            if (str.startsWith(".")) {
                return { ...prev, absentDays: "0" + str };
            }
            return prev;
        });
    };

    // Quick helper actions for Half Day
    const setExactHalfDayLOP = () => {
        const wDays = parseDaysInput(form.workingDays) || 30;
        const lDays = parseDaysInput(form.leaveDays);
        const newPresent = Math.max(0, Math.round((wDays - 0.5 - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            absentDays: "0.5",
            presentDays: String(newPresent),
        }));
        toast.info("Configured for 0.5 Day Absent (Half Day LOP)");
    };

    const applyAddHalfDayAbsent = () => {
        const wDays = parseDaysInput(form.workingDays) || 30;
        const lDays = parseDaysInput(form.leaveDays);
        const currentAbsent = parseDaysInput(form.absentDays);
        const nextAbsent = Math.min(wDays - lDays, Math.round((currentAbsent + 0.5) * 10) / 10);
        const nextPresent = Math.max(0, Math.round((wDays - nextAbsent - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            absentDays: String(nextAbsent),
            presentDays: String(nextPresent),
        }));
        toast.info(`Updated: ${nextAbsent} Days Absent (${nextPresent} Days Present)`);
    };

    const resetToFullAttendance = () => {
        const wDays = parseDaysInput(form.workingDays) || 30;
        const lDays = parseDaysInput(form.leaveDays);
        const nextPresent = Math.max(0, Math.round((wDays - lDays) * 10) / 10);
        setForm((prev) => ({
            ...prev,
            absentDays: "0",
            presentDays: String(nextPresent),
        }));
        toast.info("Reset to Full Attendance (0 Absent Days)");
    };

    /* ================= LIVE CALCULATION ================= */
    const calculation = useMemo(() => {
        const totalDays = parseDaysInput(form.workingDays) || 30;
        const absentDays = parseDaysInput(form.absentDays);

        return calculatePayroll({
            basic: Number(form.basic) || 0,
            hra: Number(form.hra) || 0,
            da: Number(form.da) || 0,
            travelling: Number(form.travelling) || 0,
            increment: Number(form.increment) || 0,
            overtime: Number(form.overtime) || 0,
            bonus: Number(form.bonus) || 0,
            incentive: Number(form.incentive) || 0,
            totalDays,
            absentDays,
            includePF: form.includePF,
            pfAmount: form.pfAmount ? Number(form.pfAmount) : undefined,
            includeESI: form.includeESI,
            esiAmount: form.esiAmount ? Number(form.esiAmount) : undefined,
            staffDeposit: Number(form.staffDeposit) || 0,
            advance: Number(form.advance) || 0,
            penalty: Number(form.penalty) || 0,
            personalLoan: Number(form.personalLoan) || 0,
            otherDeductions: Number(form.otherDeductions) || 0,
            professionalTax: Number(form.professionalTax) || 0,
        });
    }, [form]);

    /* ================= HANDLE SUBMIT ================= */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployeeId) {
            toast.error("Please select an employee");
            return;
        }

        if (!form.payPeriod.trim()) {
            toast.error("Pay period is required (e.g. October 2026)");
            return;
        }

        setSubmitting(true);
        try {
            const workingDaysNum = parseDaysInput(form.workingDays) || 30;
            let absentDaysNum = parseDaysInput(form.absentDays);
            let presentDaysNum = parseDaysInput(form.presentDays);
            const leaveDaysNum = parseDaysInput(form.leaveDays);

            if (absentDaysNum === 0 && presentDaysNum > 0 && presentDaysNum < workingDaysNum) {
                absentDaysNum = Math.max(0, Math.round((workingDaysNum - presentDaysNum - leaveDaysNum) * 10) / 10);
            } else if (presentDaysNum === 0 && absentDaysNum > 0 && absentDaysNum < workingDaysNum) {
                presentDaysNum = Math.max(0, Math.round((workingDaysNum - absentDaysNum - leaveDaysNum) * 10) / 10);
            }

            const payload = {
                employeeId: selectedEmployeeId,
                payPeriod: form.payPeriod,
                date: form.date,
                cycleStartDate: form.cycleStartDate,
                cycleEndDate: form.cycleEndDate,
                workingDays: workingDaysNum,
                presentDays: presentDaysNum,
                leaveDays: leaveDaysNum,
                absentDays: absentDaysNum,
                remainingLeave: parseDaysInput(form.remainingLeave),
                basic: Number(form.basic) || 0,
                hra: Number(form.hra) || 0,
                da: Number(form.da) || 0,
                travelling: Number(form.travelling) || 0,
                increment: Number(form.increment) || 0,
                overtime: Number(form.overtime) || 0,
                bonus: Number(form.bonus) || 0,
                incentive: Number(form.incentive) || 0,
                includePF: form.includePF,
                pfAmount: form.pfAmount ? Number(form.pfAmount) : undefined,
                includeESI: form.includeESI,
                esiAmount: form.esiAmount ? Number(form.esiAmount) : undefined,
                staffDeposit: Number(form.staffDeposit) || 0,
                advance: Number(form.advance) || 0,
                penalty: Number(form.penalty) || 0,
                personalLoan: Number(form.personalLoan) || 0,
                otherDeductions: Number(form.otherDeductions) || 0,
                professionalTax: Number(form.professionalTax) || 0,
                preparedBy: form.preparedBy,
                checkedBy: form.checkedBy,
                approvedBy: form.approvedBy,
                customSlipId: form.customSlipId.trim() || undefined,
                notes: form.notes,
            };

            const res = await fetch("/api/salary/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data.error || "Failed to issue salary slip");
                return;
            }

            toast.success("Salary slip successfully issued!");

            const s = data.salary;
            setGeneratedSlip({
                _id: s._id,
                slipId: s.slipId,
                employeeName: s.employeeName,
                employeeCode: s.employeeCode,
                designation: s.designation,
                department: s.department,
                branchName: s.branchName,
                workingDays: s.workingDays,
                presentDays: s.presentDays,
                leaveDays: s.leaveDays,
                absentDays: s.absentDays,
                payPeriod: s.payPeriod,
                remainingLeave: s.remainingLeave,
                accumulatedStaffDeposit: s.accumulatedStaffDeposit,
                basicSalary: s.basicSalary || { full: 0, actual: 0 },
                hra: s.hra || { full: 0, actual: 0 },
                da: s.da || { full: 0, actual: 0 },
                travellingAllowance: s.travellingAllowance || { full: 0, actual: 0 },
                increment: s.increment,
                overtime: s.overtime,
                bonus: s.bonus,
                incentive: s.incentive,
                totalEarnings: s.totalEarnings || { full: 0, actual: 0 },
                penalty: s.penalty,
                otherDeduction: s.otherDeduction,
                providentFund: s.providentFund,
                esi: s.esi,
                professionalTax: s.professionalTax,
                advance: s.advance,
                lop: s.lop,
                personalLoan: s.personalLoan,
                staffDeposit: s.staffDeposit,
                totalDeductions: s.totalDeductions,
                netSalary: s.netSalary,
                amountInWords: s.amountInWords,
            });

            setPayslipModalOpen(true);
        } catch (err) {
            console.error("Salary creation submit error:", err);
            toast.error("An error occurred while creating salary slip");
        } finally {
            setSubmitting(false);
        }
    };

    if (authStatus === "loading" || loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader />

            {/* Title & Navigation */}
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
                            <span>Staff Salary Calculator & Slip Generator</span>
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </h1>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Compute real-time earnings, LOP deductions, statutory contributions, and print official payslips
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/employees/salary/sheet")}
                        className="text-xs font-semibold gap-1.5 rounded-xl border-slate-300"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Master Register</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/employees/salary/history")}
                        className="text-xs font-semibold gap-1.5 rounded-xl border-slate-300"
                    >
                        <History className="w-4 h-4 text-blue-600" />
                        <span>Slips History</span>
                    </Button>
                </div>
            </div>

            {/* Main Form + Real-time Calculation Grid */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Employee Selector Bar */}
                <Card className="p-4 border-amber-300/60 bg-amber-50/40 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-1">
                                Select Staff Member
                            </label>
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            >
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} ({emp.employeeId || emp.designation || "Staff"}) &mdash; {emp.branch?.name || "Main Branch"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {currentEmployee && (
                            <div className="md:col-span-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-700 pt-1 md:pt-0">
                                <div>
                                    <span className="text-slate-400 block uppercase font-bold">Role & Branch:</span>
                                    <span className="font-semibold text-slate-900">
                                        {currentEmployee.designation || currentEmployee.role} &bull; {currentEmployee.branch?.name || "Main"}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block uppercase font-bold">Bank Account:</span>
                                    <span className="font-mono font-semibold text-slate-900">
                                        {currentEmployee.bankAccountNo ? `...${currentEmployee.bankAccountNo.slice(-4)}` : "Not linked"}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block uppercase font-bold">Current Staff Deposit:</span>
                                    <span className="font-bold text-amber-700">
                                        ₹{formatNumberINR(currentEmployee.accumulatedStaffDeposit || 0)}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block uppercase font-bold">Remaining Leaves:</span>
                                    <span className="font-semibold text-slate-900">
                                        {currentEmployee.remainingLeave ?? 0} days
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Form Column (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Period & Attendance Card */}
                        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span>1. Pay Period & Attendance Details</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Pay Period (Month Year) *
                                    </label>
                                    <Input
                                        value={form.payPeriod}
                                        onChange={(e) => setForm({ ...form, payPeriod: e.target.value })}
                                        placeholder="e.g. October 2026"
                                        className="h-9 rounded-xl text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Voucher Date (DD/MM/YYYY)
                                    </label>
                                    <Input
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Cycle Start Date
                                    </label>
                                    <Input
                                        value={form.cycleStartDate}
                                        onChange={(e) => setForm({ ...form, cycleStartDate: e.target.value })}
                                        placeholder="e.g. 26-SEP-2026"
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Cycle End Date
                                    </label>
                                    <Input
                                        value={form.cycleEndDate}
                                        onChange={(e) => setForm({ ...form, cycleEndDate: e.target.value })}
                                        placeholder="e.g. 25-OCT-2026"
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Working Days
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={form.workingDays}
                                        onChange={(e) => handleWorkingDaysChange(e.target.value)}
                                        onBlur={handleWorkingDaysBlur}
                                        className="h-9 rounded-xl text-sm text-center"
                                        min="0.5"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-slate-600">
                                            Present Days
                                        </label>
                                        {parseDaysInput(form.presentDays) % 1 !== 0 && (
                                            <span className="text-3xs font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                                Half Day
                                            </span>
                                        )}
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={form.presentDays}
                                        onChange={(e) => handlePresentDaysChange(e.target.value)}
                                        onBlur={handlePresentDaysBlur}
                                        placeholder="e.g. 29.5"
                                        className="h-9 rounded-xl text-sm text-center font-bold text-emerald-700"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-slate-600">
                                            Absent (LOP) Days
                                        </label>
                                        {parseDaysInput(form.absentDays) % 1 !== 0 && (
                                            <span className="text-3xs font-black uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                                                Half Day
                                            </span>
                                        )}
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={form.absentDays}
                                        onChange={(e) => handleAbsentDaysChange(e.target.value)}
                                        onBlur={handleAbsentDaysBlur}
                                        placeholder="e.g. 0.5"
                                        className="h-9 rounded-xl text-sm text-center font-bold text-rose-600 bg-rose-50/50"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Remaining Leaves
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={form.remainingLeave}
                                        onChange={(e) => setForm({ ...form, remainingLeave: e.target.value })}
                                        className="h-9 rounded-xl text-sm text-center"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Half Day Quick Presets */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                                    Half Day Quick Select:
                                </span>
                                <button
                                    type="button"
                                    onClick={setExactHalfDayLOP}
                                    className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <span>0.5 Day Absent (Half Day)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={applyAddHalfDayAbsent}
                                    className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <span>+0.5 Day LOP</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToFullAttendance}
                                    className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Full Attendance (0 LOP)</span>
                                </button>
                            </div>
                        </Card>

                        {/* Earnings Card */}
                        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-emerald-600" />
                                    <span>2. Monthly Earnings Components</span>
                                </span>
                                <span className="text-xs font-semibold text-emerald-700 font-mono">
                                    Gross: ₹{formatNumberINR(calculation.totalEarnings)}
                                </span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Basic Salary (Monthly) *
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.basic}
                                        onChange={(e) => setForm({ ...form, basic: e.target.value })}
                                        className="h-9 rounded-xl text-sm font-semibold"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        House Rent Allowance (HRA)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.hra}
                                        onChange={(e) => setForm({ ...form, hra: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Dearness Allowance (DA)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.da}
                                        onChange={(e) => setForm({ ...form, da: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Travelling Allowance
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.travelling}
                                        onChange={(e) => setForm({ ...form, travelling: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Increment
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.increment}
                                        onChange={(e) => setForm({ ...form, increment: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Performance Incentive / Bonus
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.incentive}
                                        onChange={(e) => setForm({ ...form, incentive: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Deductions Card */}
                        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-rose-600" />
                                    <span>3. Deductions & Retentions</span>
                                </span>
                                <span className="text-xs font-semibold text-rose-600 font-mono">
                                    Total: -₹{formatNumberINR(calculation.totalDeductions)}
                                </span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Statutory PF */}
                                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.includePF}
                                                onChange={(e) => setForm({ ...form, includePF: e.target.checked })}
                                                className="rounded-xs text-amber-600 w-4 h-4"
                                            />
                                            <span>Provident Fund (PF)</span>
                                        </label>
                                        <span className="text-xs font-mono font-bold text-slate-700">
                                            ₹{formatNumberINR(calculation.pf)}
                                        </span>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="Auto (12% of Basic)"
                                        value={form.pfAmount}
                                        onChange={(e) => setForm({ ...form, pfAmount: e.target.value })}
                                        disabled={!form.includePF}
                                        className="h-8 text-xs rounded-lg bg-white"
                                    />
                                </div>

                                {/* Statutory ESI */}
                                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.includeESI}
                                                onChange={(e) => setForm({ ...form, includeESI: e.target.checked })}
                                                className="rounded-xs text-amber-600 w-4 h-4"
                                            />
                                            <span>ESI Contribution</span>
                                        </label>
                                        <span className="text-xs font-mono font-bold text-slate-700">
                                            ₹{formatNumberINR(calculation.esi)}
                                        </span>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="Auto (0.75% of Gross)"
                                        value={form.esiAmount}
                                        onChange={(e) => setForm({ ...form, esiAmount: e.target.value })}
                                        disabled={!form.includeESI}
                                        className="h-8 text-xs rounded-lg bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Staff Deposit Retention (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.staffDeposit}
                                        onChange={(e) => setForm({ ...form, staffDeposit: e.target.value })}
                                        className="h-9 rounded-xl text-sm font-semibold"
                                        min="0"
                                    />
                                    <span className="text-2xs text-slate-400 mt-0.5 block">
                                        Added to employee cumulative savings
                                    </span>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Salary Advance Recovery
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.advance}
                                        onChange={(e) => setForm({ ...form, advance: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Personal Loan Recovery
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.personalLoan}
                                        onChange={(e) => setForm({ ...form, personalLoan: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Penalty / Fine
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.penalty}
                                        onChange={(e) => setForm({ ...form, penalty: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Signatures & Notes */}
                        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                                4. Slip Identifiers & Signatures
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Prepared By
                                    </label>
                                    <Input
                                        value={form.preparedBy}
                                        onChange={(e) => setForm({ ...form, preparedBy: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Checked By
                                    </label>
                                    <Input
                                        value={form.checkedBy}
                                        onChange={(e) => setForm({ ...form, checkedBy: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Approved By
                                    </label>
                                    <Input
                                        value={form.approvedBy}
                                        onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Custom Slip ID (Optional)
                                    </label>
                                    <Input
                                        value={form.customSlipId}
                                        onChange={(e) => setForm({ ...form, customSlipId: e.target.value })}
                                        placeholder="Leave blank for auto ID (e.g. 3645)"
                                        className="h-9 rounded-xl text-sm font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                                        Remarks / Notes
                                    </label>
                                    <Input
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Optional payment notes"
                                        className="h-9 rounded-xl text-sm"
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Summary Column (5 cols) Sticky Calculation Card */}
                    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
                        <Card className="border-2 border-slate-900 bg-slate-900 text-white shadow-xl rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-slate-800 bg-slate-950/60">
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                                    Official Compensation Breakdown
                                </span>
                                <h3 className="text-xl font-black text-white mt-0.5">
                                    {currentEmployee?.name || "Staff Member"}
                                </h3>
                                <p className="text-xs text-slate-400 font-mono">
                                    Period: {form.payPeriod || "N/A"}
                                </p>
                            </div>

                            <div className="p-5 space-y-4 text-sm divide-y divide-slate-800">
                                {/* Daily Salary Rate */}
                                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                                    <span>Daily Salary Rate:</span>
                                    <span className="font-mono text-white font-bold">
                                        ₹{formatNumberINR(calculation.dailySalary)} / day
                                    </span>
                                </div>

                                {/* Earnings Subtotal */}
                                <div className="pt-3 space-y-1.5">
                                    <div className="flex justify-between font-bold text-slate-300">
                                        <span>Total Gross Earnings</span>
                                        <span className="text-emerald-400 font-mono">
                                            +₹{formatNumberINR(calculation.totalEarnings)}
                                        </span>
                                    </div>
                                    <div className="text-2xs text-slate-400 pl-2">
                                        Basic (₹{form.basic}) + HRA (₹{form.hra}) + DA (₹{form.da}) + Travelling (₹{form.travelling})
                                    </div>
                                </div>

                                {/* Deductions Subtotal */}
                                <div className="pt-3 space-y-2">
                                    <div className="flex justify-between font-bold text-slate-300">
                                        <span>Total Deductions</span>
                                        <span className="text-rose-400 font-mono">
                                            -₹{formatNumberINR(calculation.totalDeductions)}
                                        </span>
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-400 pl-2">
                                        {calculation.lop > 0 && (
                                            <div className="space-y-0.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span>LOP / Absent ({parseDaysInput(form.absentDays)} {parseDaysInput(form.absentDays) === 1 ? "day" : "days"}):</span>
                                                        {parseDaysInput(form.absentDays) % 1 !== 0 && (
                                                            <span className="text-3xs font-extrabold uppercase bg-rose-500/30 text-rose-300 px-1 py-0.2 rounded">
                                                                Half Day
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-rose-300 font-mono font-bold">-₹{formatNumberINR(calculation.lop)}</span>
                                                </div>
                                                <div className="text-3xs text-slate-400 flex justify-between pr-0.5">
                                                    <span>Daily: ₹{formatNumberINR(calculation.dailySalary)}</span>
                                                    <span>Half Day: ₹{formatNumberINR(Math.round((calculation.dailySalary / 2) * 100) / 100)}</span>
                                                </div>
                                            </div>
                                        )}
                                        {calculation.pf > 0 && (
                                            <div className="flex justify-between">
                                                <span>Provident Fund (12%):</span>
                                                <span className="text-rose-300 font-mono">-₹{formatNumberINR(calculation.pf)}</span>
                                            </div>
                                        )}
                                        {calculation.esi > 0 && (
                                            <div className="flex justify-between">
                                                <span>ESI (0.75%):</span>
                                                <span className="text-rose-300 font-mono">-₹{formatNumberINR(calculation.esi)}</span>
                                            </div>
                                        )}
                                        {calculation.staffDeposit > 0 && (
                                            <div className="flex justify-between">
                                                <span>Staff Deposit Retention:</span>
                                                <span className="text-amber-300 font-mono">-₹{formatNumberINR(calculation.staffDeposit)}</span>
                                            </div>
                                        )}
                                        {calculation.advance > 0 && (
                                            <div className="flex justify-between">
                                                <span>Advance Recovery:</span>
                                                <span className="text-rose-300 font-mono">-₹{formatNumberINR(calculation.advance)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* NET SALARY CARD */}
                                <div className="pt-4 pb-2 bg-slate-950/80 -mx-5 px-5 py-4 border-t border-b border-amber-500/30">
                                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                        Net Take-Home Salary Payable
                                    </div>
                                    <div className="text-3xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
                                        ₹{formatNumberINR(calculation.netSalary)}
                                    </div>
                                    <div className="text-2xs text-slate-400 italic mt-1 leading-snug">
                                        {calculation.amountInWords}
                                    </div>
                                </div>

                                {/* Cumulative Staff Deposit Outlook */}
                                <div className="pt-3 flex items-center justify-between text-xs text-amber-200/90">
                                    <span>Updated Cumulative Deposit:</span>
                                    <span className="font-bold font-mono">
                                        ₹{formatNumberINR(
                                            (Number(currentEmployee?.accumulatedStaffDeposit) || 0) + calculation.staffDeposit
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="p-5 bg-slate-950">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm h-12 rounded-xl shadow-lg cursor-pointer gap-2 transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{submitting ? "Issuing Slip..." : "Generate & Issue Payslip"}</span>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>

            {/* Generated Payslip Modal */}
            <PayslipModal
                isOpen={payslipModalOpen}
                onClose={() => setPayslipModalOpen(false)}
                data={generatedSlip}
            />
        </div>
    );
}

export default function SalaryCalculatorPage() {
    return (
        <Suspense fallback={<LoadingOverlay show={true} />}>
            <SalaryCalculatorContent />
        </Suspense>
    );
}
