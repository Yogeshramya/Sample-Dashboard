"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Group } from "@/types/group";
import { Download } from "lucide-react";

interface Employee {
    _id: string;
    name: string;
}

interface Row {
    _id: string;
    mfLoanId: string;
    customerName: string;
    groupName: string;
    groupId: string;
    employeeName: string;
    totalSavings: number;
    refundedAt: string;
    loanId?: string;
    customerId?: string;
    customerCode?: string;
    customerPhone?: string;
}

export default function SavingsRefundReportPage() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [rows, setRows] = useState<Row[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    const [filters, setFilters] = useState({
        from: "",
        to: "",
        group: "ALL",
        employee: "ALL",
    });

    useEffect(() => {
        if (isTeller) {
            setFilters(prev => ({ ...prev, from: todayIST, to: todayIST }));
        }
    }, [isTeller, todayIST]);

    async function fetchReport() {
        let url = `/api/report/savings-report?`;

        const fromDate = isTeller ? todayIST : filters.from;
        const toDate = isTeller ? todayIST : filters.to;

        if (fromDate) url += `from=${fromDate}&`;
        if (toDate) url += `to=${toDate}&`;
        if (filters.group !== "ALL") url += `group=${filters.group}&`;
        if (filters.employee !== "ALL") url += `employee=${filters.employee}&`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
            toast.error("Failed to load report");
            return;
        }

        setRows(data.rows || []);
    }

    useEffect(() => {
        if (isTeller) {
            fetchReport();
        }
    }, [isTeller]);

    useEffect(() => {
        async function loadMeta() {
            const [g, e] = await Promise.all([
                fetch("/api/group/list").then(r => r.json()),
                fetch("/api/employees/list").then(r => r.json()),
            ]);

            setGroups(g.groups || []);
            setEmployees(e.employees || []);
        }

        loadMeta();
    }, []);

    const totalRefunded = rows.reduce(
        (sum, r) => sum + (r.totalSavings || 0),
        0
    );

    return (
        <section className="max-w-7xl mx-auto p-6 space-y-8">
            <PageHeader />

            <h1 className="text-3xl font-bold text-blue-600">
                Savings Refund Report
            </h1>

            {/* Filters */}
            <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                {isTeller ? (
                    <div className="flex items-center px-3 py-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold col-span-1 md:col-span-2">
                        Report date: Today (IST) ({todayIST})
                    </div>
                ) : (
                    <>
                        <Input
                            type="date"
                            value={filters.from}
                            onChange={e => setFilters({ ...filters, from: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={filters.to}
                            onChange={e => setFilters({ ...filters, to: e.target.value })}
                        />
                    </>
                )}

                <Select
                    value={filters.group}
                    onValueChange={v => setFilters({ ...filters, group: v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Group" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Groups</SelectItem>
                        {groups.map(g => (
                            <SelectItem key={g._id} value={g._id}>
                                {g.groupName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.employee}
                    onValueChange={v => setFilters({ ...filters, employee: v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Employees</SelectItem>
                        {employees.map(e => (
                            <SelectItem key={e._id} value={e._id}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button onClick={fetchReport}>Generate</Button>
            </Card>

            {/* Summary */}
            <Card className="p-4 flex items-left justify-between bg-green-50 border-green-200">
                <div>
                    <p className="text-sm text-gray-600">Total Savings Refunded</p>
                    <p className="text-2xl font-bold text-green-700">
                        ₹{totalRefunded.toLocaleString()}
                    </p>
                </div>

                <div className="text-sm text-gray-500">
                    Records: <span className="font-semibold">{rows.length}</span>
                </div>
            </Card>

            {/* Table */}
            <Card className="p-4 overflow-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 border">Loan ID</th>
                            <th className="p-3 border">Customer</th>
                            <th className="p-3 border">Group</th>
                            <th className="p-3 border">Employee</th>
                            <th className="p-3 border">Savings Refunded</th>
                            <th className="p-3 border">Refund Date</th>
                            <th className="p-3 border text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-6 text-center text-gray-500">
                                    No records found
                                </td>
                            </tr>
                        )}

                        {rows.map(r => (
                            <tr key={r._id} className="text-center hover:bg-gray-50">
                                <td className="border p-2">{r.mfLoanId}</td>
                                <td className="border p-2">{r.customerName}</td>
                                <td className="border p-2">
                                    {r.groupName} ({r.groupId})
                                </td>
                                <td className="border p-2">{r.employeeName}</td>
                                <td className="border p-2 font-bold text-green-700">
                                    ₹{r.totalSavings.toLocaleString()}
                                </td>
                                <td className="border p-2">
                                    {new Date(r.refundedAt).toLocaleDateString("en-GB")}
                                </td>
                                <td className="border p-2 text-center">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(`/api/report/savings-report/download/${r._id}`, "_blank")}
                                        className="cursor-pointer border-blue-600 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 mx-auto text-xs font-semibold px-2.5 py-1 h-8 rounded-lg shadow-2xs"
                                        title="Download Individual Savings Refund Form"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download Form</span>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </section>
    );
}
