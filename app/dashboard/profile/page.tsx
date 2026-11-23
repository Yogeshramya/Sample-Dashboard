"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    UserCheck,
    KeyRound,
    Building2,
    Mail,
    Shield,
    Calendar,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    Lock,
    BadgeCheck,
    Info,
    RefreshCw,
    Coins,
    Edit3,
    Phone,
    MapPin,
    CreditCard,
    FileSpreadsheet,
    Plus,
    X,
} from "lucide-react";
import PayslipModal, { PayslipData } from "@/components/PayslipModal";
import { formatNumberINR } from "@/lib/payroll";

interface BranchInfo {
    _id: string;
    name: string;
    code: string;
}

interface EmployeeProfileData {
    _id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
    fatherName?: string;
    age?: number;
    dob?: string;
    designation?: string;
    department?: string;
    phone?: string;
    address?: string;
    joiningDate?: string;
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
    branch?: BranchInfo | null;
    branches?: BranchInfo[];
    profileImage?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface SalaryRecord {
    _id: string;
    slipId: string;
    employeeName: string;
    employeeCode: string;
    fatherName?: string;
    bankName?: string;
    bankAccountNo?: string;
    panNo?: string;
    pfNo?: string;
    esiNo?: string;
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

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const employeeIdParam = searchParams.get("id");

    const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(true);
    const [canAdminReset, setCanAdminReset] = useState(false);
    const [loading, setLoading] = useState(true);

    // Salary Details & Slips
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [loadingSalaries, setLoadingSalaries] = useState(false);
    const [selectedPayslipData, setSelectedPayslipData] = useState<PayslipData | null>(null);
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);

    // Password reset form state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);

    // Edit HR details modal state (Admin only)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [savingDetails, setSavingDetails] = useState(false);
    const [editForm, setEditForm] = useState({
        employeeCode: "",
        fatherName: "",
        age: "",
        dob: "",
        designation: "",
        department: "Operations",
        phone: "",
        address: "",
        joiningDate: "",
        bankName: "STATE BANK OF INDIA",
        bankAccountNo: "",
        panNo: "",
        pfNo: "",
        esiNo: "",
        basicSalary: "",
        hra: "",
        da: "",
        travellingAllowance: "",
    });

    // Fetch profile and salary records
    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const url = employeeIdParam
                ? `/api/employees/profile?id=${encodeURIComponent(employeeIdParam)}`
                : `/api/employees/profile`;

            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to load employee profile");
                return;
            }

            const emp = data.employee;
            setEmployee(emp);
            setIsOwnProfile(Boolean(data.isOwnProfile));
            setCanAdminReset(Boolean(data.canAdminReset));

            // Populate edit form defaults
            setEditForm({
                employeeCode: emp.employeeId || "",
                fatherName: emp.fatherName || "",
                age: emp.age ? String(emp.age) : "",
                dob: emp.dob || "",
                designation: emp.designation || "",
                department: emp.department || "Operations",
                phone: emp.phone || "",
                address: emp.address || "",
                joiningDate: emp.joiningDate || "",
                bankName: emp.bankName || "STATE BANK OF INDIA",
                bankAccountNo: emp.bankAccountNo || "",
                panNo: emp.panNo || "",
                pfNo: emp.pfNo || "",
                esiNo: emp.esiNo || "",
                basicSalary: emp.basicSalary ? String(emp.basicSalary) : "12000",
                hra: emp.hra !== undefined ? String(emp.hra) : "4000",
                da: emp.da !== undefined ? String(emp.da) : "4000",
                travellingAllowance:
                    emp.travellingAllowance !== undefined ? String(emp.travellingAllowance) : "500",
            });

            // Fetch employee's salary slip history
            setLoadingSalaries(true);
            try {
                const salRes = await fetch(`/api/salary/list?employeeId=${emp._id}`, {
                    cache: "no-store",
                });
                const salData = await salRes.json();
                if (salData.success) {
                    setSalaries(salData.salaries || []);
                }
            } catch (salErr) {
                console.error("Error fetching salaries:", salErr);
            } finally {
                setLoadingSalaries(false);
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
            toast.error("Could not load employee details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [employeeIdParam]);

    // Handle password reset
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isOwnProfile && !currentPassword.trim()) {
            toast.error("Please enter your current password");
            return;
        }

        if (!newPassword.trim()) {
            toast.error("Please enter a new password");
            return;
        }

        if (newPassword.length < 4) {
            toast.error("New password must be at least 4 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation do not match");
            return;
        }

        setResettingPassword(true);

        try {
            const res = await fetch("/api/employees/profile/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: employee?._id,
                    currentPassword: isOwnProfile ? currentPassword : "",
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to reset password");
                return;
            }

            toast.success(data.message || "Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordModalOpen(false);
        } catch (err) {
            console.error("Password reset error:", err);
            toast.error("Network error while updating password");
        } finally {
            setResettingPassword(false);
        }
    };

    // Save HR Details
    const handleSaveHRDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;

        setSavingDetails(true);
        try {
            const res = await fetch("/api/employees/update-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: employee._id,
                    employeeCode: editForm.employeeCode,
                    fatherName: editForm.fatherName,
                    age: editForm.age,
                    dob: editForm.dob,
                    designation: editForm.designation,
                    department: editForm.department,
                    phone: editForm.phone,
                    address: editForm.address,
                    joiningDate: editForm.joiningDate,
                    bankName: editForm.bankName,
                    bankAccountNo: editForm.bankAccountNo,
                    panNo: editForm.panNo,
                    pfNo: editForm.pfNo,
                    esiNo: editForm.esiNo,
                    basicSalary: editForm.basicSalary,
                    hra: editForm.hra,
                    da: editForm.da,
                    travellingAllowance: editForm.travellingAllowance,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to update employee details");
                return;
            }

            toast.success("Employee records updated successfully");
            setEditModalOpen(false);
            fetchProfileData();
        } catch (err) {
            console.error("Save details error:", err);
            toast.error("Failed to save changes");
        } finally {
            setSavingDetails(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "ADMINISTRATOR":
                return {
                    label: "Administrator",
                    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
                };
            case "ACCOUNTS_HEAD":
                return {
                    label: "Accounts Head",
                    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300",
                };
            case "AREA_MANAGER":
                return {
                    label: "Area Manager",
                    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
                };
            case "MANAGER":
                return {
                    label: "Branch Manager",
                    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
                };
            case "TELLER":
                return {
                    label: "Branch Teller",
                    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
                };
            case "EMPLOYEE_MFI":
                return {
                    label: "Customer Supporting Officer",
                    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
                };
            default:
                return {
                    label: role || "Staff",
                    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
                };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Loading employee profile...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-slate-600">Employee profile not found or access denied.</p>
                <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const roleInfo = getRoleBadge(employee.role);
    const employeeCodeDisplay =
        employee.employeeId ||
        employee.email.split("@")[0].toUpperCase() ||
        "RPMFI-C240";

    const formattedJoinDate = employee.joiningDate
        ? employee.joiningDate
        : employee.createdAt
        ? new Date(employee.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "01/04/2024";

    // Only issued salary slips should be shown in the employee profile
    const issuedSalaries = salaries.filter((s) => {
        const st = (s.status || "").toUpperCase();
        return st === "ISSUED" || st === "PAID" || st === "PROCESSED" || (!st && Boolean(s.slipId));
    });

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-16">
            {/* Top Navigation & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black bg-gradient-to-r from-slate-950 via-slate-800 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
                            <span>Employee Profile &mdash; {employee.name}</span>
                            {isOwnProfile && (
                                <span className="text-xs bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                                    My Account
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-slate-500">
                            Verified personnel records, compensation history, and salary slips
                        </p>
                    </div>
                </div>

                {/* Admin Quick Action Buttons */}
                {session?.user?.role === "ADMINISTRATOR" && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            onClick={() => setEditModalOpen(true)}
                            variant="outline"
                            size="sm"
                            className="border-slate-300 font-bold text-xs gap-1.5"
                        >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            Edit Profile Details
                        </Button>

                        <Button
                            onClick={() =>
                                router.push(`/dashboard/staff salary/calculator?employeeId=${employee._id}`)
                            }
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 font-bold text-xs gap-1.5 shadow-sm"
                        >
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            Issue Salary Slip
                        </Button>
                    </div>
                )}
            </div>

            {/* MAIN WHITE CANVAS (Matching attached screenshot layout) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-10 max-w-4xl mx-auto space-y-6">
                {/* Title: PROFILE (Centered, orange font as in screenshot) */}
                <div className="text-center pt-2 pb-4">
                    <h1 className="text-xl sm:text-2xl font-black text-[#E65100] tracking-wider uppercase">
                        PROFILE
                    </h1>
                </div>

                {/* Key-Value Details (Single vertical list with bold black labels and colons) */}
                <div className="space-y-2.5 text-xs sm:text-sm pl-2 sm:pl-4">
                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">ID :</span>
                        <span className="font-bold text-black uppercase font-mono">{employeeCodeDisplay}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">NAME :</span>
                        <span className="font-bold text-black uppercase">{employee.name}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">FATHER NAME :</span>
                        <span className="font-bold text-black uppercase">{employee.fatherName || "KESAVAN"}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">AGE :</span>
                        <span className="font-bold text-black">{employee.age || "23"}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">DESIGNATION :</span>
                        <span className="font-bold text-black">{employee.designation || "Customer Supporting Officer"}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">BRANCH :</span>
                        <span className="font-bold text-black">{employee.branch?.name || "Kumbakonam"}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">PHONE NO :</span>
                        <span className="font-bold text-black font-mono">{employee.phone || "8667432607"}</span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">ADDRESS :</span>
                        <span className="font-bold text-black uppercase leading-relaxed max-w-xl">
                            {employee.address || "NO;1/120,AGRAHARAM STREET,KALLUR, KUMBAKONAM(TK),THANJAVUR(DT) 612503."}
                        </span>
                    </div>

                    <div className="flex items-start">
                        <span className="w-40 sm:w-48 font-black text-black uppercase shrink-0">E-MAIL :</span>
                        <span className="font-bold text-black lowercase">{employee.email}</span>
                    </div>
                </div>

                {/* Section: User Control Details */}
                <div className="pt-4 pl-2 sm:pl-4 space-y-2.5">
                    <h2 className="text-sm sm:text-base font-black text-[#E65100]">
                        User Control Details
                    </h2>

                    <div className="space-y-2.5 text-xs sm:text-sm">
                        <div className="flex items-center">
                            <span className="w-40 sm:w-48 font-black text-black">User Name</span>
                            <span className="font-bold text-black font-mono">{employeeCodeDisplay}</span>
                        </div>

                        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                            <span className="w-40 sm:w-48 font-black text-black">Password</span>
                            <span className="font-mono text-slate-500 text-xs sm:text-sm tracking-widest">••••••••</span>
                            <button
                                type="button"
                                onClick={() => setPasswordModalOpen(true)}
                                className="text-blue-700 font-bold hover:underline text-xs sm:text-sm ml-2 cursor-pointer"
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section: Salary Details */}
                <div className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm sm:text-base font-black text-black underline underline-offset-4 tracking-wide">
                            Salary Details
                        </h2>
                        {session?.user?.role === "ADMINISTRATOR" && (
                            <button
                                onClick={() =>
                                    router.push(`/dashboard/staff-salary/calculator?employeeId=${employee._id}`)
                                }
                                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-300 transition-colors shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" /> Issue New Slip
                            </button>
                        )}
                    </div>

                    <div className="border border-slate-300 overflow-x-auto shadow-2xs">
                        <table className="w-full text-left text-xs sm:text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-[#800000] text-white font-bold">
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        View Salary Slip
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        ID
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        Date
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        Absent Days
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        Incentive
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        Advance
                                    </th>
                                    <th className="py-2 px-2.5 sm:px-3 text-center border border-slate-400 font-bold whitespace-nowrap">
                                        Net Salary
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loadingSalaries ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-8 text-center text-slate-500 font-medium border border-slate-300"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                                                <span>Loading salary slips...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : issuedSalaries.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-10 text-center border border-slate-300 bg-slate-50/50"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-3">
                                                <FileSpreadsheet className="w-9 h-9 text-slate-400 stroke-[1.5]" />
                                                <p className="font-bold text-sm text-slate-700">No slip issued</p>
                                                <p className="text-xs text-slate-500">
                                                    No salary slip has been issued for this employee yet.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    issuedSalaries.map((s, idx) => (
                                        <tr
                                            key={s._id}
                                            className={`hover:bg-amber-50/50 ${
                                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                            }`}
                                        >
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayslipData({
                                                            ...s,
                                                            fatherName: s.fatherName || employee.fatherName || "",
                                                            joiningDate: employee.joiningDate || formattedJoinDate,
                                                            dob: employee.dob || "",
                                                            bankName: s.bankName || employee.bankName || "STATE BANK OF INDIA",
                                                            bankAccountNo: s.bankAccountNo || employee.bankAccountNo || "",
                                                            panNo: s.panNo || employee.panNo || "",
                                                            pfNo: s.pfNo || employee.pfNo || "",
                                                            esiNo: s.esiNo || employee.esiNo || "",
                                                            accumulatedStaffDeposit:
                                                                s.accumulatedStaffDeposit ??
                                                                employee.accumulatedStaffDeposit ??
                                                                0,
                                                            remainingLeave:
                                                                s.remainingLeave ??
                                                                employee.remainingLeave ??
                                                                0,
                                                        } as PayslipData);
                                                        setPayslipModalOpen(true);
                                                    }}
                                                    className="px-3 py-0.5 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-400 rounded-xs text-xs font-semibold text-neutral-800 shadow-2xs transition-colors cursor-pointer"
                                                >
                                                    Select
                                                </button>
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-medium">
                                                {s.slipId}
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-mono">
                                                {s.date}
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-medium text-slate-800">
                                                {s.absentDays}
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-mono">
                                                {formatNumberINR(
                                                    s.incentive?.full || s.incentive?.actual || 0
                                                )}
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-mono">
                                                {formatNumberINR(s.advance || 0)}
                                            </td>
                                            <td className="py-1.5 px-2.5 sm:px-3 text-center border border-slate-300 font-mono font-bold text-slate-900">
                                                {formatNumberINR(s.netSalary)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PASSWORD RESET MODAL */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-[#E65100]" />
                                <span>Change Account Password</span>
                            </h3>
                            <button
                                onClick={() => setPasswordModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            {isOwnProfile && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-700">
                                        Current Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="rounded-xl"
                                        autoComplete="current-password"
                                    />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-700">
                                    New Password
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter new password (min. 4 characters)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="rounded-xl"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-700">
                                    Confirm New Password
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Re-enter new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="rounded-xl"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPasswordModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={resettingPassword}
                                    className="bg-slate-900 text-amber-400 font-bold"
                                >
                                    {resettingPassword ? "Updating..." : "Update Password"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT HR DETAILS MODAL (ADMIN ONLY) */}
            {editModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden my-auto border border-slate-200">
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                            <h3 className="font-bold text-sm uppercase tracking-wide">
                                Edit Personnel & Bank Records &mdash; {employee.name}
                            </h3>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveHRDetails} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">
                                        Staff ID / Code (e.g. RPMFI-C240)
                                    </label>
                                    <Input
                                        value={editForm.employeeCode}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, employeeCode: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">
                                        Father&apos;s Name
                                    </label>
                                    <Input
                                        value={editForm.fatherName}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, fatherName: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Age</label>
                                    <Input
                                        type="number"
                                        value={editForm.age}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, age: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">
                                        Designation
                                    </label>
                                    <Input
                                        value={editForm.designation}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, designation: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                                    <Input
                                        value={editForm.phone}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, phone: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Joining Date</label>
                                    <Input
                                        value={editForm.joiningDate}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, joiningDate: e.target.value })
                                        }
                                        placeholder="01-Apr-2024"
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="font-bold text-slate-700 block mb-1">Address</label>
                                    <Input
                                        value={editForm.address}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, address: e.target.value })
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Bank & Statutory Details */}
                            <div className="pt-2 border-t border-slate-200">
                                <h4 className="font-bold text-slate-900 mb-2">Bank & Statutory KYC</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            Bank Name
                                        </label>
                                        <Input
                                            value={editForm.bankName}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, bankName: e.target.value })
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            Account Number
                                        </label>
                                        <Input
                                            value={editForm.bankAccountNo}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    bankAccountNo: e.target.value,
                                                })
                                            }
                                            className="rounded-xl font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            PAN Number
                                        </label>
                                        <Input
                                            value={editForm.panNo}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, panNo: e.target.value })
                                            }
                                            className="rounded-xl font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            PF Number
                                        </label>
                                        <Input
                                            value={editForm.pfNo}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, pfNo: e.target.value })
                                            }
                                            className="rounded-xl font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Salary Structure Presets */}
                            <div className="pt-2 border-t border-slate-200">
                                <h4 className="font-bold text-slate-900 mb-2">Default Salary Components</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            Basic (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            value={editForm.basicSalary}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, basicSalary: e.target.value })
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            HRA (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            value={editForm.hra}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, hra: e.target.value })
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            DA (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            value={editForm.da}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, da: e.target.value })
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">
                                            Travel (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            value={editForm.travellingAllowance}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    travellingAllowance: e.target.value,
                                                })
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={savingDetails}
                                    className="bg-slate-900 text-amber-400 font-bold"
                                >
                                    {savingDetails ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Official Printable Payslip Modal */}
            <PayslipModal
                isOpen={payslipModalOpen}
                onClose={() => setPayslipModalOpen(false)}
                data={selectedPayslipData}
            />
        </div>
    );
}

export default function EmployeeProfilePage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-sm font-semibold text-slate-600">Loading employee profile...</p>
                </div>
            }
        >
            <ProfileContent />
        </Suspense>
    );
}
