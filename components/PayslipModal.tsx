"use client";

import React, { useRef } from "react";
import { Printer, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumberINR } from "@/lib/payroll";

export interface PayslipData {
    _id?: string;
    slipId: string;
    employeeName: string;
    employeeCode: string;
    fatherName?: string;
    joiningDate?: string;
    dob?: string;
    designation?: string;
    department?: string;
    branchName?: string;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    payPeriod: string;
    bankName?: string;
    bankAccountNo?: string;
    panNo?: string;
    pfNo?: string;
    esiNo?: string;
    accumulatedStaffDeposit?: number;
    remainingLeave?: number;

    // Earnings
    basicSalary: { full: number; actual: number };
    hra: { full: number; actual: number };
    increment?: { full: number; actual: number };
    da: { full: number; actual: number };
    travellingAllowance: { full: number; actual: number };
    overtime?: { full: number; actual: number };
    bonus?: { full: number; actual: number };
    incentive?: { full: number; actual: number };
    totalEarnings: { full: number; actual: number };

    // Deductions
    penalty?: number;
    otherDeduction?: number;
    providentFund: number;
    esi: number;
    professionalTax?: number;
    advance?: number;
    lop: number;
    personalLoan?: number;
    staffDeposit: number;
    totalDeductions: number;

    // Net
    netSalary: number;
    amountInWords: string;
}

interface PayslipModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PayslipData | null;
}

export default function PayslipModal({ isOpen, onClose, data }: PayslipModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !data) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
                {/* Modal Toolbar (hidden on print) */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <h2 className="text-sm font-bold tracking-wide uppercase">
                            Official Employee Payslip &mdash; {data.slipId}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrint}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Print / Save PDF
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Payslip Body */}
                <div
                    ref={printRef}
                    id="printable-payslip"
                    className="p-6 md:p-10 bg-white text-slate-900 print:p-4 print:text-black"
                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                >
                    {/* Payslip Header Card */}
                    <div className="border border-black p-4 mb-4">
                        <div className="flex items-center justify-between gap-4">
                            {/* Logo */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-16 h-16 border-2 border-blue-900 rounded-lg flex items-center justify-center bg-blue-50/50">
                                    <span className="text-2xl font-black text-blue-900 tracking-tighter">
                                        YP
                                    </span>
                                </div>
                            </div>

                            {/* Company Titles */}
                            <div className="flex-1 text-center">
                                <h1 className="text-xl md:text-2xl font-black tracking-wide text-slate-950 uppercase">
                                    SAMPLE PRIME SMALL FINANCE PVT LTD
                                </h1>
                                <p className="text-xs font-semibold tracking-widest text-slate-700 uppercase mt-0.5">
                                    SMART CHOICE SECURE FUTURE
                                </p>
                                <h2 className="text-sm md:text-base font-bold text-slate-900 mt-2">
                                    Payslip for the period of {data.payPeriod}
                                </h2>
                            </div>

                            <div className="w-16 shrink-0 hidden sm:block" />
                        </div>
                    </div>

                    {/* Employee Profile Information (2-Column Grid Table) */}
                    <div className="border border-black text-xs md:text-sm mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black">
                            {/* Left Column */}
                            <div className="divide-y divide-black">
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Employee Name</span>
                                    <span className="col-span-7 font-bold text-blue-950 uppercase">
                                        {data.employeeName}
                                    </span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Father&apos;s Name</span>
                                    <span className="col-span-7 uppercase">{data.fatherName || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Joining Date</span>
                                    <span className="col-span-7">{data.joiningDate || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Designation</span>
                                    <span className="col-span-7">{data.designation || "Staff"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Department</span>
                                    <span className="col-span-7">{data.department || "Operations"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Branch</span>
                                    <span className="col-span-7">{data.branchName || "Main Branch"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Working Days</span>
                                    <span className="col-span-7">{data.workingDays}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Present Days</span>
                                    <span className="col-span-7">{data.presentDays}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Leave Days</span>
                                    <span className="col-span-7">{data.leaveDays}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">LOP Days</span>
                                    <span className="col-span-7 font-semibold text-red-700">
                                        {data.absentDays}
                                    </span>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="divide-y divide-black">
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Employee ID</span>
                                    <span className="col-span-7 font-bold">{data.employeeCode}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Date of Birth</span>
                                    <span className="col-span-7">{data.dob || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Pay Period</span>
                                    <span className="col-span-7 font-semibold">{data.payPeriod}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Bank Name</span>
                                    <span className="col-span-7">{data.bankName || "STATE BANK OF INDIA"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Bank Account No</span>
                                    <span className="col-span-7 font-mono">{data.bankAccountNo || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">PAN No</span>
                                    <span className="col-span-7 font-mono">{data.panNo || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">PF No</span>
                                    <span className="col-span-7 font-mono">{data.pfNo || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">ESI No</span>
                                    <span className="col-span-7 font-mono">{data.esiNo || "—"}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Staff Deposit</span>
                                    <span className="col-span-7 font-semibold">
                                        ₹{formatNumberINR(data.accumulatedStaffDeposit ?? data.staffDeposit)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-5 font-bold">Remaining Leave</span>
                                    <span className="col-span-7">{data.remainingLeave ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Earnings vs Deductions Table */}
                    <div className="border border-black text-xs md:text-sm mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-black">
                            {/* Earnings Side (7 cols) */}
                            <div className="md:col-span-7 divide-y divide-black">
                                <div className="grid grid-cols-12 py-1.5 px-3 font-bold bg-slate-100 text-slate-900 border-b border-black">
                                    <span className="col-span-6">Total Earnings</span>
                                    <span className="col-span-3 text-right">Full</span>
                                    <span className="col-span-3 text-right">Actual</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Basic Salary</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.basicSalary.full)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.basicSalary.actual)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">HRA</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.hra.full)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.hra.actual)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Increment</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.increment?.full ?? 0)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.increment?.actual ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">DA</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.da.full)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.da.actual)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Travelling Allowance</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.travellingAllowance.full)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.travellingAllowance.actual)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Overtime & Others</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.overtime?.full ?? 0)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.overtime?.actual ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Bonus</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.bonus?.full ?? 0)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.bonus?.actual ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-6 font-medium">Incentive</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.incentive?.full ?? 0)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.incentive?.actual ?? 0)}</span>
                                </div>
                                {/* Total Earnings Footer */}
                                <div className="grid grid-cols-12 py-1.5 px-3 font-bold bg-slate-50 border-t border-black">
                                    <span className="col-span-6">Total Earnings INR :</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.totalEarnings.full)}</span>
                                    <span className="col-span-3 text-right">{formatNumberINR(data.totalEarnings.actual)}</span>
                                </div>
                            </div>

                            {/* Deductions Side (5 cols) */}
                            <div className="md:col-span-5 divide-y divide-black">
                                <div className="grid grid-cols-12 py-1.5 px-3 font-bold bg-slate-100 text-slate-900 border-b border-black">
                                    <span className="col-span-8">Deductions</span>
                                    <span className="col-span-4 text-right">Actual</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Penalty</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.penalty ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Other Deduction</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.otherDeduction ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Provident Fund</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.providentFund)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">ESI</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.esi)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Professional Tax</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.professionalTax ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Advance</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.advance ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">LOP</span>
                                    <span className="col-span-4 text-right font-semibold text-red-700">
                                        {formatNumberINR(data.lop)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Personal Loan</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.personalLoan ?? 0)}</span>
                                </div>
                                <div className="grid grid-cols-12 py-1 px-3">
                                    <span className="col-span-8 font-medium">Staff Deposit</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.staffDeposit)}</span>
                                </div>
                                {/* Total Deductions Footer */}
                                <div className="grid grid-cols-12 py-1.5 px-3 font-bold bg-slate-50 border-t border-black">
                                    <span className="col-span-8">Total Deductions INR :</span>
                                    <span className="col-span-4 text-right">{formatNumberINR(data.totalDeductions)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Pay Box */}
                    <div className="border border-black p-3 mb-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm md:text-base font-bold gap-2">
                            <span>Net Pay for the month (Total Earnings - Total Deduction) :</span>
                            <span className="text-lg md:text-xl font-black text-blue-950 font-mono">
                                ₹{formatNumberINR(data.netSalary)}
                            </span>
                        </div>
                        <div className="text-xs md:text-sm font-semibold text-slate-800 border-t border-dashed border-slate-300 pt-2">
                            <span className="text-slate-600 font-medium">Amount in Words : </span>
                            {data.amountInWords}
                        </div>
                    </div>

                    {/* Disclaimer Note */}
                    <div className="text-center text-[11px] font-medium text-slate-600 italic">
                        This is a system generated payslip and does not require signature.
                    </div>
                </div>

                {/* Print specific CSS injection */}
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-payslip,
                        #printable-payslip * {
                            visibility: visible;
                        }
                        #printable-payslip {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20px !important;
                            margin: 0 !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
