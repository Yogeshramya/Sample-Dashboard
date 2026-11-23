"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Group } from "@/types/group";
import { PendingLoanItem } from "@/types/fund";
import {
    AlertCircle,
    Building2,
    Calendar,
    Phone,
    Search,
    User,
    Wallet
} from "lucide-react";

interface Employee {
    _id: string;
    name: string;
}

export default function LoanPendingPage() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [pending, setPending] = useState<PendingLoanItem[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
    const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
    const [weekDate, setWeekDate] = useState(todayIST);

    useEffect(() => {
        if (isTeller) {
            setWeekDate(todayIST);
        }
    }, [isTeller, todayIST]);

    const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Load initial employees, centers, and pending records
    useEffect(() => {
        async function init() {
            try {
                const [empRes, grpRes] = await Promise.all([
                    fetch("/api/employees/list").then((r) => r.json()),
                    fetch("/api/group?status=ACTIVE").then((r) => r.json()),
                ]);

                if (empRes.success) setEmployees(empRes.employees || []);
                if (grpRes.success) setGroups(grpRes.groups || []);
            } catch {
                toast.error("Failed to load initial data");
            }

            // Auto-load all pending loans on page load
            setLoading(true);
            try {
                const res = await fetch("/api/fund/pending");
                const json = await res.json();
                if (json.success) {
                    setPending(json.pending || []);
                    if (json.weekStart && json.weekEnd) {
                        setWeekRange({ start: json.weekStart, end: json.weekEnd });
                    }
                }
            } catch (err) {
                console.error("Initial pending load error:", err);
            } finally {
                setLoading(false);
            }
        }

        init();
    }, []);

    // Load groups when employee changes
    async function handleEmployeeSelect(id: string) {
        setSelectedEmployee(id);
        setSelectedGroup("ALL");

        try {
            const url = id && id !== "ALL"
                ? `/api/group?employeeId=${id}&status=ACTIVE`
                : `/api/group?status=ACTIVE`;
            const res = await fetch(url);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch {
            toast.error("Failed to load centers");
        }
    }

    async function fetchPending() {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (selectedEmployee && selectedEmployee !== "ALL") {
                params.append("employeeId", selectedEmployee);
            }

            if (selectedGroup && selectedGroup !== "ALL") {
                params.append("groupId", selectedGroup);
            }

            if (weekDate) {
                params.append("date", weekDate);
            }

            const res = await fetch(`/api/fund/pending?${params.toString()}`);
            const json = await res.json();

            if (json.success) {
                setPending(json.pending || []);
                if (json.weekStart && json.weekEnd) {
                    setWeekRange({ start: json.weekStart, end: json.weekEnd });
                }

                if ((json.pending || []).length === 0) {
                    toast.info("No pending dues found for this selection");
                }
            } else {
                toast.error(json.error || "Failed to fetch pending list");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error loading pending dues");
        } finally {
            setLoading(false);
        }
    }

    const totalPending = pending.reduce(
        (sum, p) => sum + (p.pendingAmount || 0),
        0
    );

    const totalCustomers = pending.length;

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            {/* Title Section */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                    Pending Loan Dues
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                    Track center-wise pending installments based on scheduled collection days (Mon – Fri).
                </p>
            </div>

            {/* Filter Bar */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xs">
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        {/* Employee Select */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-amber-600" />
                                Employee
                            </label>
                            <Select onValueChange={handleEmployeeSelect} value={selectedEmployee}>
                                <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
                                    <SelectValue placeholder="All Staff Members" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Staff Members</SelectItem>
                                    {employees.map((e) => (
                                        <SelectItem key={e._id} value={e._id}>
                                            {e.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Group / Center Select */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                                Center (Optional)
                            </label>
                            <Select
                                onValueChange={setSelectedGroup}
                                value={selectedGroup}
                            >
                                <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
                                    <SelectValue placeholder="All Centers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Centers</SelectItem>
                                    {groups.map((g) => (
                                        <SelectItem key={g._id} value={g._id}>
                                            {g.groupName} ({g.groupId || g.collectionDay || "Center"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Week Date Picker */}
                        {isTeller ? (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                    Report Date
                                </label>
                                <div className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    Today (IST): {todayIST}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                    Week Date
                                </label>
                                <Input
                                    type="date"
                                    value={weekDate}
                                    onChange={(e) => setWeekDate(e.target.value)}
                                    className="rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm"
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            onClick={fetchPending}
                            disabled={loading}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-xs hover:shadow-amber-500/10 rounded-xl h-10 transition-all cursor-pointer"
                        >
                            <Search className="w-4 h-4 mr-1.5 text-amber-400" />
                            {loading ? "Calculating..." : "Find Pending"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Week Window Badge */}
            {weekRange && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/70 border border-slate-200/80 px-3.5 py-2 rounded-xl">
                    <span>Evaluating Mon – Fri Week:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {weekRange.start}
                    </span>
                    <span>to</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {weekRange.end}
                    </span>
                </div>
            )}

            {/* Summary Cards */}
            {pending.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="rounded-2xl border border-rose-200 bg-linear-to-br from-rose-50/50 to-white shadow-xs p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                                    Total Pending Amount
                                </p>
                                <p className="text-2xl font-black text-rose-700 mt-1">
                                    ₹{totalPending.toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                                <Wallet className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/50 to-white shadow-xs p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                    Pending Borrowers
                                </p>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {totalCustomers}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                                <User className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Table */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white border-b border-amber-500/30">
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Customer</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Loan ID</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Phone</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Center</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Collection Day</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Pending Amount</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {pending.map((p: { customerId?: string; loanId?: string; customerName?: string; customerCode?: string; mfLoanId?: string; phone?: string; centerName?: string, collectionDay?: string, pendingAmount?: number }) => (
                                <tr key={p.customerId || p.loanId} className="hover:bg-amber-50/40 transition-colors">
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-slate-900 text-sm">{p.customerName}</p>
                                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[10px]">
                                            {p.customerCode || "-"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                                        {p.mfLoanId || "-"}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">
                                        <span className="inline-flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {p.phone || "-"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                        {p.centerName || "-"}
                                    </td>
                                    <td className="py-3 px-4 font-medium text-slate-600">
                                        {p.collectionDay || "Friday"}
                                    </td>
                                    <td className="py-3 px-4 font-black text-rose-600 text-sm">
                                        ₹{(p.pendingAmount || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <Link
                                            href={`/dashboard/report/pending-fund/${p.customerId}`}
                                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-900 hover:text-amber-400 text-slate-800 transition-colors"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}

                            {!loading && pending.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                        No pending dues recorded for this selection.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
}
