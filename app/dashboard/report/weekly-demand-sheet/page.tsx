"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";

interface DemandRow {
    _id: string;
    centreDay: string;
    centreName: string;
    centreTime: string;
    staffName: string;
    totalMembers: number;
    principal: number;
    interest: number;
    savings: number;
    totalAmount: number;
    collectedAmount: number;
    branch: string;
}

export default function WeeklyDemandSheetReport() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [rows, setRows] = useState<DemandRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
    const [groups, setGroups] = useState<{ _id: string; groupName: string }[]>([]);

    const [filters, setFilters] = useState({
        branch: "ALL",
        employee: "ALL",
        centre: "ALL",
        from: "",
        to: "",
    });

    useEffect(() => {
        if (isTeller) {
            setFilters((prev) => ({ ...prev, from: todayIST, to: todayIST }));
        }
    }, [isTeller, todayIST]);

    useEffect(() => {
        async function loadMeta() {
            try {
                const [empRes, grpRes] = await Promise.all([
                    fetch("/api/employees/list").then((r) => r.json()),
                    fetch("/api/group/list").then((r) => r.json()),
                ]);
                setEmployees(empRes.employees || []);
                setGroups(grpRes.groups || []);
            } catch {
                // Ignore meta load failure
            }
        }
        loadMeta();
    }, []);

    /* Fetch report */
    async function fetchReport() {
        setLoading(true);
        try {
            const queryPayload = {
                ...filters,
                ...(isTeller ? { from: todayIST, to: todayIST } : {}),
            };

            const qs = new URLSearchParams(queryPayload).toString();
            const res = await fetch(`/api/report/weekly-report?${qs}`);
            const data = await res.json();

            if (!data.success) {
                toast.error(data.message || "Failed to load report");
                return;
            }

            setRows(data.rows || []);
        } catch {
            toast.error("Error loading report");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (isTeller) {
            fetchReport();
        }
    }, [isTeller]);

    /* Totals */
    const totals = rows.reduce(
        (a, r) => {
            a.members += r.totalMembers || 0;
            a.principal += r.principal || 0;
            a.interest += r.interest || 0;
            a.savings += r.savings || 0;
            a.total += r.totalAmount || 0;
            a.collected += r.collectedAmount || 0;
            return a;
        },
        {
            members: 0,
            principal: 0,
            interest: 0,
            savings: 0,
            total: 0,
            collected: 0,
        }
    );

    return (
        <section className="max-w-7xl mx-auto p-4 space-y-6">
            <PageHeader />

            <h1 className="text-xl font-bold text-orange-600">
                WEEKLY DEMAND SHEET
            </h1>

            {/* FILTER BAR */}
            <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {isTeller ? (
                    <div className="flex items-center px-3 py-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold col-span-1 md:col-span-2">
                        Report date: Today (IST) ({todayIST})
                    </div>
                ) : (
                    <>
                        <input
                            type="date"
                            className="border p-2 rounded text-sm"
                            value={filters.from}
                            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                        />

                        <input
                            type="date"
                            className="border p-2 rounded text-sm"
                            value={filters.to}
                            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                        />
                    </>
                )}

                <select
                    className="border p-2 rounded text-sm bg-white"
                    value={filters.employee}
                    onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                >
                    <option value="ALL">All Employees</option>
                    {employees.map((e) => (
                        <option key={e._id} value={e._id}>
                            {e.name}
                        </option>
                    ))}
                </select>

                <select
                    className="border p-2 rounded text-sm bg-white"
                    value={filters.centre}
                    onChange={(e) => setFilters({ ...filters, centre: e.target.value })}
                >
                    <option value="ALL">All Centres</option>
                    {groups.map((g) => (
                        <option key={g._id} value={g._id}>
                            {g.groupName}
                        </option>
                    ))}
                </select>

                <Button className="bg-red-600 hover:bg-red-700 font-semibold" onClick={fetchReport}>
                    Submit
                </Button>
            </Card>

            {/* PRINT */}
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                    Print
                </Button>
            </div>

            {/* TABLE */}
            <Card className="overflow-auto">
                {loading ? (
                    <p className="p-6 text-center text-sm text-slate-500">Loading…</p>
                ) : (
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-indigo-700 text-white">
                            <tr>
                                {[
                                    "Sl",
                                    "Centre Day",
                                    "Centre Name",
                                    "Centre Time",
                                    "Staff Name",
                                    "Total Members",
                                    "Principal",
                                    "Interest",
                                    "Savings",
                                    "Total Amount",
                                    "Collected Amount",
                                    "Branch",
                                ].map((h) => (
                                    <th key={h} className="border p-2 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={r._id || i} className="text-center hover:bg-slate-50">
                                    <td className="border p-1">{i + 1}</td>
                                    <td className="border p-1">{r.centreDay}</td>
                                    <td className="border p-1">{r.centreName}</td>
                                    <td className="border p-1">{r.centreTime}</td>
                                    <td className="border p-1">{r.staffName}</td>
                                    <td className="border p-1">{r.totalMembers}</td>
                                    <td className="border p-1">₹{r.principal}</td>
                                    <td className="border p-1">₹{r.interest}</td>
                                    <td className="border p-1">₹{r.savings}</td>
                                    <td className="border p-1 font-semibold">₹{r.totalAmount}</td>
                                    <td className="border p-1">₹{r.collectedAmount}</td>
                                    <td className="border p-1">{r.branch}</td>
                                </tr>
                            ))}

                            {/* TOTAL ROW */}
                            {rows.length > 0 && (
                                <tr className="bg-gray-100 font-bold text-center">
                                    <td colSpan={5} className="border p-2">
                                        TOTAL
                                    </td>
                                    <td className="border p-2">{totals.members}</td>
                                    <td className="border p-2">₹{totals.principal}</td>
                                    <td className="border p-2">₹{totals.interest}</td>
                                    <td className="border p-2">₹{totals.savings}</td>
                                    <td className="border p-2">₹{totals.total}</td>
                                    <td className="border p-2">₹{totals.collected}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </Card>
        </section>
    );
}
