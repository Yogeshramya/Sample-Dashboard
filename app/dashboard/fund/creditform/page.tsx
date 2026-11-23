"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Loan } from "@/types/fund";
import { Group } from "@/types/group";
import { toast } from "sonner";
import { FileText, Printer, Search, Building2, User } from "lucide-react";

interface Employee {
    _id: string;
    name: string;
}

export default function CreditFormPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    const [search, setSearch] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [loading, setLoading] = useState(false);

    // Load employees once
    useEffect(() => {
        async function loadEmployees() {
            try {
                const res = await fetch("/api/employees/list");
                const data = await res.json();
                setEmployees(data.employees || []);
            } catch {
                toast.error("Failed to load employees");
            }
        }
        loadEmployees();
    }, []);

    // Load groups when employee changes
    async function handleEmployeeChange(empId: string) {
        setEmployeeId(empId);
        setGroupId("");
        setGroups([]);
        setLoans([]);

        try {
            const res = await fetch(`/api/group?employeeId=${empId}&status=ACTIVE`);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch {
            toast.error("Failed to load groups");
        }
    }

    // Fetch loans
    const fetchLoans = async () => {
        if (!employeeId || !groupId) {
            toast.error("Select employee and center first");
            return;
        }

        setLoading(true);
        const params = new URLSearchParams({
            groupId,
            employeeId,
        });

        if (search) params.append("search", search);

        try {
            const res = await fetch(`/api/fund/by-group?${params.toString()}`);
            const data = await res.json();
            setLoans(data.loans || []);
            if ((data.loans || []).length === 0) {
                toast.info("No records found for this center");
            }
        } catch {
            toast.error("Failed to load loans");
        } finally {
            setLoading(false);
        }
    };

    // Print / View Loan Credit Form
    const openCreditForm = (loanId: string) => {
        window.open(`/api/loancreditform/print/${loanId}`, "_blank");
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <PageHeader />

            {/* Header Title */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5">
                    <FileText className="w-7 h-7 text-amber-500" />
                    Loan Credit Form
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                    Print verified sanction and credit confirmation forms for disbursed loans.
                </p>
            </div>

            {/* Filters */}
            <Card className="p-5 rounded-2xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Search Field */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-amber-600" />
                            Search Customer
                        </label>
                        <Input
                            placeholder="Name / Code / Phone"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm"
                        />
                    </div>

                    {/* Employee */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-600" />
                            Employee
                        </label>
                        <Select onValueChange={handleEmployeeChange}>
                            <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((emp) => (
                                    <SelectItem key={emp._id} value={emp._id}>
                                        {emp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Center / Group */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" />
                            Center
                        </label>
                        <Select
                            disabled={!employeeId}
                            onValueChange={setGroupId}
                        >
                            <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
                                <SelectValue
                                    placeholder={
                                        employeeId ? "Select Center" : "Select Employee First"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.length > 0 ? (
                                    groups.map((g) => (
                                        <SelectItem key={g._id} value={g._id}>
                                            {g.groupName}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-2 text-xs">
                                        No centers found
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Apply Button */}
                    <Button
                        onClick={fetchLoans}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs hover:shadow-amber-500/10 rounded-xl h-10 transition-all cursor-pointer"
                    >
                        {loading ? "Searching..." : "Apply Filters"}
                    </Button>
                </div>
            </Card>

            {/* Loans Table */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white border-b border-amber-500/30">
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Customer</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Loan ID</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Phone</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Center</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Disbursement Date</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Amount</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loans.map((loan) => (
                                <tr key={loan._id} className="hover:bg-amber-50/40 transition-colors">
                                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                                        {loan.customer?.name || "-"}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-mono">
                                            {loan.mfLoanId || loan.customer?.customerCode || "-"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">
                                        {loan.customer?.phone || loan.phone || "-"}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                        {loan.group?.groupName || "-"}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                        {loan.loanDate ? new Date(loan.loanDate).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-slate-900">
                                        ₹{loan.loanAmount?.toLocaleString("en-IN") || 0}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openCreditForm(loan._id)}
                                            className="border-amber-500/40 text-slate-800 hover:bg-amber-50 font-bold rounded-xl h-8 px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                                            Credit Form
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && loans.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                        No loan records to display. Select an employee and center to view credit forms.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}