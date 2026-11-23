"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Group } from "@/types/group";
import { Loan } from "@/types/fund";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

interface GroupSummaryRow {
    employeeName: string;
    collectionTime: string;
    groupName: string;
    groupId: string;
    members: number;
    collectionDay: string;
    principal: number;
    interest: number;
    savings: number;
    total: number;
}

/* ================= HELPERS ================= */

function calculateGroupWeek(group: Group, baseDate: Date) {
    if (!group?.dueStarts) return null;

    const created = new Date(group.dueStarts);

    if (group.dueOn === "MONTHLY") {
        return (
            (baseDate.getFullYear() - created.getFullYear()) * 12 +
            (baseDate.getMonth() - created.getMonth()) +
            1
        );
    }

    const diffMs = baseDate.getTime() - created.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1;
}

/* ================= PAGE ================= */

export default function WeeklyDemandSheetPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");

    const [groupSummaries, setGroupSummaries] = useState<GroupSummaryRow[]>([]);
    const [dayFilter, setDayFilter] = useState("ALL");
    const [loading, setLoading] = useState(false);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        fetch("/api/employees/list")
            .then((r) => r.json())
            .then((d) => setEmployees(d.employees || []))
            .catch(() => toast.error("Failed to load employees"));
    }, []);

    /* ================= FETCH GROUPS ================= */

    async function fetchEmployeeGroups(empId: string) {
        if (!empId) return;

        setEmployeeId(empId);
        setGroupSummaries([]);
        setLoading(true);

        try {
            let fetchedGroups: Group[] = [];

            if (empId === "ALL") {
                const res = await fetch(`/api/group/search?status=ACTIVE`);
                fetchedGroups = await res.json();
            } else {
                const res = await fetch(`/api/group/search?query=${empId}&status=ACTIVE`);
                fetchedGroups = await res.json();
            }

            // DAY FILTER
            if (dayFilter !== "ALL") {
                fetchedGroups = fetchedGroups.filter(
                    (g) => (g.collectionDay || "").toLowerCase() === dayFilter.toLowerCase()
                );
            }

            const today = new Date();
            const summaryRows: GroupSummaryRow[] = [];

            for (const group of fetchedGroups) {
                const weekNo = calculateGroupWeek(group, today);
                if (!weekNo) continue;

                const fundRes = await fetch(`/api/fund/by-group?groupId=${group._id}`);
                const fundData = await fundRes.json();
                const loans: Loan[] = fundData.loans || [];
                const members = loans.length;

                let principal = 0,
                    interest = 0,
                    savings = 0,
                    total = 0,
                    hasAnyDue = false;

                loans.forEach((loan) => {
                    const due = loan.dues?.[weekNo];
                    if (!due) return;

                    hasAnyDue = true;
                    principal += Number(due.principal || 0);
                    interest += Number(due.interest || 0);
                    savings += Number(due.savings || 0);
                    total += Number(due.total || 0);
                });

                if (!hasAnyDue) continue;

                const empName =
                    employees.find((e) => e._id === group.employee?._id)?.name || "-";

                summaryRows.push({
                    employeeName: empName,
                    groupName: group.groupName,
                    groupId: group.groupId,
                    members,
                    collectionDay: group.collectionDay || "-",
                    collectionTime: group.collectionTime || "-",
                    principal,
                    interest,
                    savings,
                    total,
                });
            }

            setGroupSummaries(summaryRows);
        } catch {
            toast.error("Failed to load center timetable report");
        } finally {
            setLoading(false);
        }
    }

    const grandTotals = groupSummaries.reduce(
        (a, g) => {
            a.principal += g.principal;
            a.interest += g.interest;
            a.savings += g.savings;
            a.total += g.total;
            return a;
        },
        { principal: 0, interest: 0, savings: 0, total: 0 }
    );

    /* ================= UI ================= */

    return (
        <section className="max-w-7xl mx-auto p-6 space-y-6">
            <PageHeader />

            <h1 className="text-3xl font-bold text-blue-700">Center Timetable Report</h1>

            <Card className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-3xl">
                    {/* 1. EMPLOYEE */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Employee</label>
                        <Select
                            value={employeeId}
                            onValueChange={(v) => setEmployeeId(v)}
                        >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="ALL">All Employees</SelectItem>
                                {employees.map((e) => (
                                    <SelectItem key={e._id} value={e._id}>
                                        {e.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. COLLECTION DAY */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Collection Day
                        </label>
                        <Select value={dayFilter} onValueChange={setDayFilter}>
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="All Days" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Days</SelectItem>
                                <SelectItem value="Monday">Monday</SelectItem>
                                <SelectItem value="Tuesday">Tuesday</SelectItem>
                                <SelectItem value="Wednesday">Wednesday</SelectItem>
                                <SelectItem value="Thursday">Thursday</SelectItem>
                                <SelectItem value="Friday">Friday</SelectItem>
                                <SelectItem value="Saturday">Saturday</SelectItem>
                                <SelectItem value="Sunday">Sunday</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. SEARCH BUTTON */}
                    <div>
                        <button
                            onClick={() => fetchEmployeeGroups(employeeId)}
                            disabled={!employeeId}
                            className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium text-sm transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </Card>

            {/* TABLE */}
            {loading ? (
                <p className="text-center py-6">Loading…</p>
            ) : groupSummaries.length > 0 ? (
                <Card className="p-4 overflow-auto">
                    <table className="w-full text-sm border">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th className="border p-2">Employee</th>
                                <th className="border p-2">Center</th>
                                <th className="border p-2">Collection Day</th>
                                <th className="border p-2">Collection Time</th>
                                <th className="border p-2">Members</th>
                                <th className="border p-2">Principal</th>
                                <th className="border p-2">Interest</th>
                                <th className="border p-2">Savings</th>
                                <th className="border p-2">Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {groupSummaries.map((g, i) => (
                                <tr key={i} className="text-center hover:bg-gray-50">
                                    <td className="border p-2 font-semibold">{g.employeeName}</td>
                                    <td className="border p-2">
                                        {g.groupName} ({g.groupId})
                                    </td>
                                    <td className="border p-2">{g.collectionDay}</td>
                                    <td className="border p-2">{g.collectionTime}</td>
                                    <td className="border p-2 font-semibold">{g.members}</td>
                                    <td className="border p-2">₹{g.principal}</td>
                                    <td className="border p-2">₹{g.interest}</td>
                                    <td className="border p-2">₹{g.savings}</td>
                                    <td className="border p-2 font-bold text-blue-700">₹{g.total}</td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-gray-100 font-bold">
                            <tr className="text-center">
                                <td colSpan={5} className="border p-2">
                                    GRAND TOTAL
                                </td>
                                <td className="border p-2 text-green-700">₹{grandTotals.principal}</td>
                                <td className="border p-2 text-green-700">₹{grandTotals.interest}</td>
                                <td className="border p-2 text-green-700">₹{grandTotals.savings}</td>
                                <td className="border p-2 text-blue-800 text-lg">₹{grandTotals.total}</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            ) : (
                employeeId && (
                    <p className="text-center text-gray-500 py-6">
                        No centers found for selected criteria
                    </p>
                )
            )}
        </section>
    );
}