"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Group } from "@/types/group";
import { Building2, Search, Calendar, UserCheck, RefreshCw } from "lucide-react";

interface Employee {
    _id: string;
    name: string;
}

export default function ClosedGroupReport() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";

    const [groups, setGroups] = useState<Group[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isTeller) {
            const today = getTodayIST();
            setFrom(today);
            setTo(today);
        }
    }, [isTeller]);

    /* Load employees safely on mount */
    useEffect(() => {
        let isMounted = true;

        async function fetchEmployees() {
            try {
                const res = await fetch("/api/employees/list");
                const data = await res.json();
                if (isMounted) {
                    setEmployees(data.employees || []);
                }
            } catch {
                if (isMounted) {
                    toast.error("Failed to load employees");
                }
            }
        }

        fetchEmployees();

        return () => {
            isMounted = false;
        };
    }, []);

    const loadReport = useCallback(async () => {
        setLoading(true);

        try {
            const queryFrom = isTeller ? (from || getTodayIST()) : from;
            const queryTo = isTeller ? (to || getTodayIST()) : to;

            const params = new URLSearchParams();
            params.append("status", "CLOSED");
            if (employeeId) params.append("employeeId", employeeId);
            if (queryFrom) params.append("from", queryFrom);
            if (queryTo) params.append("to", queryTo);

            const res = await fetch(`/api/group/list?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to load closed centers");
                setGroups([]);
                return;
            }

            let list: Group[] = data.groups || [];

            // Client-side date filter safeguard
            if (from || to) {
                list = list.filter((g) => {
                    const dateVal = g.closedAt || (g).updatedAt;
                    if (!dateVal) return false;
                    const d = new Date(dateVal).getTime();
                    if (from && d < new Date(from).setHours(0, 0, 0, 0)) return false;
                    if (to && d > new Date(to).setHours(23, 59, 59, 999)) return false;
                    return true;
                });
            }

            // Search filter by Center ID or Name
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                list = list.filter(
                    (g) =>
                        g.groupName?.toLowerCase().includes(q) ||
                        g.groupId?.toLowerCase().includes(q)
                );
            }

            setGroups(list);

            if (list.length === 0) {
                toast.info("No closed centers found for the selected criteria");
            }
        } catch {
            toast.error("An error occurred while fetching the report");
        } finally {
            setLoading(false);
        }
    }, [employeeId, from, to, isTeller, search]);

    useEffect(() => {
        if (isTeller && from) {
            void loadReport();
        }
    }, [isTeller, from, loadReport]);

    if (!session) {
        return (
            <div className="p-12 text-center text-slate-500 font-medium">
                Please log in to view this report.
            </div>
        );
    }

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader />

            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5">
                        <Building2 className="w-7 h-7 text-amber-500" />
                        Closed Center Report
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        View and filter all closed centers by employee, date, or center ID.
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/90 shadow-sm backdrop-blur-md">
                <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                        {/* Employee Select */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                Employee
                            </label>
                            <select
                                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                            >
                                <option value="">All Employees</option>
                                {employees.map((e) => (
                                    <option key={e._id} value={e._id}>
                                        {e.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isTeller ? (
                            <div className="sm:col-span-2 flex items-center p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-slate-700 text-sm font-medium">
                                Report date: Today (IST)
                            </div>
                        ) : (
                            <>
                                {/* From Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                        From Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        className="rounded-xl border border-slate-300 bg-slate-50 text-sm h-10"
                                    />
                                </div>

                                {/* To Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                        To Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="rounded-xl border border-slate-300 bg-slate-50 text-sm h-10"
                                    />
                                </div>
                            </>
                        )}

                        {/* Search Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                <Search className="w-3.5 h-3.5 text-amber-600" />
                                Search Center
                            </label>
                            <Input
                                placeholder="Center name or ID"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-slate-50 text-sm h-10"
                            />
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={loadReport}
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-sm rounded-xl h-10 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RefreshCw
                                className={`w-4 h-4 text-amber-400 ${loading ? "animate-spin" : ""
                                    }`}
                            />
                            {loading ? "Generating..." : "Generate"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Report Table */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white border-b border-amber-500/30">
                                <th className="py-3.5 px-4 font-bold text-amber-400 tracking-wider w-14 text-center">
                                    S.No
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Center ID
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Center Name
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Assigned Staff
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">
                                    Total Members
                                </th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                                    Closed Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groups.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-12 text-center text-slate-400 font-medium"
                                    >
                                        No closed centers found matching your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                groups.map((g, index) => {
                                    const employeeName =
                                        typeof g.employee === "object" && g.employee !== null
                                            ? (g.employee).name
                                            : "-";

                                    const closedDateStr = g.closedAt
                                        ? new Date(g.closedAt).toLocaleDateString("en-IN")
                                        : (g).updatedAt
                                            ? new Date((g).updatedAt).toLocaleDateString("en-IN")
                                            : "-";

                                    return (
                                        <tr
                                            key={g._id || index}
                                            className="hover:bg-amber-50/40 transition-colors"
                                        >
                                            <td className="py-3 px-4 text-center font-bold text-slate-700 bg-slate-50/50">
                                                {index + 1}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-amber-700">
                                                {g.groupId || "-"}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {g.groupName || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 font-medium">
                                                {employeeName}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-slate-800">
                                                {g.totalMembers ?? 0}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                {closedDateStr}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
}