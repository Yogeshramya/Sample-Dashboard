"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { useSession } from "next-auth/react";
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
import type { Group } from "@/types/group";
import { AlertCircle, Calendar, Printer, Search } from "lucide-react";
import { getTodayIST } from "@/lib/ist";

interface ArrearRow {
    _id: string;
    arrearFromWeek: number;
    arrearTillWeek: number;
    principal: number;
    interest: number;
    savings: number;
    totalAmount: number;
    remainingAmount: number;
    status: "OPEN" | "CLOSED";
    createdAt: string;
    group?: { groupName: string; groupId?: string };
    loan?: {
        mfLoanId: string;
        loanAmount?: number;
        phone?: string;
        customer?: {
            name: string;
            phone?: string;
            customerCode?: string;
        };
    };
}

interface ArrearReportResponse {
    success?: boolean;
    arrears?: ArrearRow[];
    error?: string;
}

export default function ArrearReportPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";
    const todayIST = getTodayIST();

    const [rows, setRows] = useState<ArrearRow[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [filters, setFilters] = useState({
        from: "",
        to: "",
        group: "ALL",
        status: "ALL",
    });

    useEffect(() => {
        let cancelled = false;

        async function loadGroups() {
            try {
                const response = await fetch("/api/group/list", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Failed to load groups");
                }

                const data: { groups?: Group[] } = await response.json();

                if (!cancelled) {
                    setGroups(Array.isArray(data.groups) ? data.groups : []);
                }
            } catch {
                if (!cancelled) {
                    toast.error("Failed to load groups");
                }
            }
        }

        void loadGroups();

        return () => {
            cancelled = true;
        };
    }, []);

    const fetchReport = useCallback(async () => {
        if (!isTeller && filters.from && filters.to && filters.from > filters.to) {
            toast.error("The start date cannot be later than the end date");
            return;
        }

        setLoading(true);

        try {
            const params = new URLSearchParams();

            if (!isTeller) {
                if (filters.from) params.set("from", filters.from);
                if (filters.to) params.set("to", filters.to);
            }
            if (filters.group !== "ALL") params.set("group", filters.group);
            if (filters.status !== "ALL") params.set("status", filters.status);

            const query = params.toString();
            const url = query
                ? `/api/report/arrear?${query}`
                : "/api/report/arrear";

            const response = await fetch(url, {
                method: "GET",
                cache: "no-store",
            });

            const data: ArrearReportResponse = await response.json();

            if (!response.ok || data.success !== true) {
                throw new Error(data.error || "Failed to load arrear report");
            }

            setRows(Array.isArray(data.arrears) ? data.arrears : []);
        } catch (error) {
            console.error("Arrear report error:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Error loading arrear report"
            );
        } finally {
            setLoading(false);
        }
    }, [filters, isTeller]);

    // Automatically load arrears on mount
    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    // Client-side quick search
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase().trim();
        return rows.filter((r) => {
            const loanId = (r.loan?.mfLoanId || "").toLowerCase();
            const customerName = (r.loan?.customer?.name || "").toLowerCase();
            const customerCode = (r.loan?.customer?.customerCode || "").toLowerCase();
            const groupName = (r.group?.groupName || "").toLowerCase();
            return (
                loanId.includes(q) ||
                customerName.includes(q) ||
                customerCode.includes(q) ||
                groupName.includes(q)
            );
        });
    }, [rows, searchQuery]);

    const totals = useMemo(() => {
        return filteredRows.reduce(
            (acc, row) => {
                acc.principal += Number(row.principal) || 0;
                acc.interest += Number(row.interest) || 0;
                acc.savings += Number(row.savings) || 0;
                acc.total += Number(row.totalAmount) || 0;
                acc.remaining += Number(row.remainingAmount) || 0;
                return acc;
            },
            {
                principal: 0,
                interest: 0,
                savings: 0,
                total: 0,
                remaining: 0,
            }
        );
    }, [filteredRows]);

    const formatCurrency = (value: number) =>
        `₹${value.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        })}`;

    return (
        <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="no-print">
                <PageHeader />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-red-600 tracking-tight flex items-center gap-2">
                        <AlertCircle className="w-7 h-7 text-red-600" />
                        ARREAR REPORT
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        Track accounts with overdue installments, remaining balances, and partial payment records.
                    </p>
                </div>

                <div className="flex items-center gap-2 no-print">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="gap-1.5"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </Button>
                </div>
            </div>

            {/* FILTER BAR */}
            <Card className="p-4 no-print border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end">
                    {isTeller ? (
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                Report Date
                            </label>
                            <div className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Today (IST): {todayIST}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                                    From Date
                                </label>
                                <Input
                                    aria-label="From date"
                                    type="date"
                                    value={filters.from}
                                    max={filters.to || undefined}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            from: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                                    To Date
                                </label>
                                <Input
                                    aria-label="To date"
                                    type="date"
                                    value={filters.to}
                                    min={filters.from || undefined}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            to: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                            Center / Group
                        </label>
                        <Select
                            value={filters.group}
                            onValueChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    group: value,
                                }))
                            }
                        >
                            <SelectTrigger aria-label="Filter by group">
                                <SelectValue placeholder="All Groups" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Groups</SelectItem>
                                {groups.map((group) => (
                                    <SelectItem key={group._id} value={group._id}>
                                        {group.groupName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                            Status
                        </label>
                        <Select
                            value={filters.status}
                            onValueChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    status: value,
                                }))
                            }
                        >
                            <SelectTrigger aria-label="Filter by status">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                <SelectItem value="OPEN">Open (Unpaid)</SelectItem>
                                <SelectItem value="CLOSED">Closed (Paid)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={() => void fetchReport()}
                        className="bg-red-600 hover:bg-red-700 font-semibold"
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Filter Report"}
                    </Button>
                </div>
            </Card>

            {/* SUMMARY CARDS */}
            <Card className="grid grid-cols-2 gap-4 bg-red-50/70 border-red-200 p-4 sm:grid-cols-2 lg:grid-cols-5 shadow-xs">
                <Summary
                    label="Principal in Arrear"
                    value={totals.principal}
                    color="text-green-700"
                    formatCurrency={formatCurrency}
                />
                <Summary
                    label="Interest in Arrear"
                    value={totals.interest}
                    color="text-orange-600"
                    formatCurrency={formatCurrency}
                />
                <Summary
                    label="Savings in Arrear"
                    value={totals.savings}
                    color="text-purple-700"
                    formatCurrency={formatCurrency}
                />
                <Summary
                    label="Total Arrear Billed"
                    value={totals.total}
                    color="text-slate-900"
                    formatCurrency={formatCurrency}
                />
                <Summary
                    label="Remaining Balance"
                    value={totals.remaining}
                    color="text-red-700 font-black"
                    formatCurrency={formatCurrency}
                />
            </Card>

            {/* SEARCH BAR & RECORD COUNT */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        type="text"
                        placeholder="Search borrower, loan, center..."
                        className="pl-9 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-xs font-semibold text-slate-600">
                    Showing <span className="text-slate-900 font-bold">{filteredRows.length}</span> of {rows.length} arrears
                </div>
            </div>

            {/* TABLE */}
            <Card className="overflow-x-auto p-0 border border-slate-200 shadow-sm rounded-xl">
                {loading ? (
                    <p className="py-12 text-center text-sm text-slate-500">Loading arrear report...</p>
                ) : filteredRows.length > 0 ? (
                    <table className="w-full min-w-[1050px] text-xs border-collapse">
                        <thead className="bg-slate-900 text-white font-semibold">
                            <tr>
                                <th className="border-b border-slate-700 p-3 text-left">Loan ID</th>
                                <th className="border-b border-slate-700 p-3 text-left">Customer</th>
                                <th className="border-b border-slate-700 p-3 text-left">Center</th>
                                <th className="border-b border-slate-700 p-3 text-center">Weeks</th>
                                <th className="border-b border-slate-700 p-3 text-right">Principal</th>
                                <th className="border-b border-slate-700 p-3 text-right">Interest</th>
                                <th className="border-b border-slate-700 p-3 text-right">Savings</th>
                                <th className="border-b border-slate-700 p-3 text-right">Total</th>
                                <th className="border-b border-slate-700 p-3 text-right">Remaining</th>
                                <th className="border-b border-slate-700 p-3 text-center">Status</th>
                                <th className="border-b border-slate-700 p-3 text-center">Date</th>
                                <th className="border-b border-slate-700 p-3 text-center no-print">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRows.map((row) => (
                                <tr key={row._id} className="hover:bg-amber-50/40 transition-colors">
                                    <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                                        {row.loan?.mfLoanId || row._id.slice(-6)}
                                    </td>
                                    <td className="p-3 text-left">
                                        <p className="font-bold text-slate-900 text-sm">
                                            {row.loan?.customer?.name || "Unknown"}
                                        </p>
                                        {row.loan?.customer?.customerCode && (
                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                                                {row.loan.customer.customerCode}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 font-medium text-slate-800">
                                        {row.group?.groupName || "-"}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-slate-700">
                                        {row.arrearFromWeek === row.arrearTillWeek
                                            ? `W${row.arrearFromWeek}`
                                            : `W${row.arrearFromWeek}–${row.arrearTillWeek}`}
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">
                                        {formatCurrency(Number(row.principal) || 0)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">
                                        {formatCurrency(Number(row.interest) || 0)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">
                                        {formatCurrency(Number(row.savings) || 0)}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-900">
                                        {formatCurrency(Number(row.totalAmount) || 0)}
                                    </td>
                                    <td className="p-3 text-right font-black text-red-700">
                                        {formatCurrency(Number(row.remainingAmount) || 0)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span
                                            className={
                                                row.status === "CLOSED"
                                                    ? "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200"
                                                    : "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                                            }
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-slate-500 whitespace-nowrap">
                                        {row.createdAt && !Number.isNaN(Date.parse(row.createdAt))
                                            ? new Date(row.createdAt).toLocaleDateString("en-IN")
                                            : "-"}
                                    </td>
                                    <td className="p-3 text-center no-print">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={row.status === "CLOSED"}
                                            onClick={() => router.push(`/dashboard/arrear/${row._id}`)}
                                            className="h-7 text-xs font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                        >
                                            Collect
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="py-12 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-600">No arrears found</p>
                        <p className="text-xs text-slate-400">All customer loan dues in this selection are up to date.</p>
                    </div>
                )}
            </Card>
        </section>
    );
}

function Summary({
    label,
    value,
    color,
    formatCurrency,
}: {
    label: string;
    value: number;
    color: string;
    formatCurrency: (value: number) => string;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>
                {formatCurrency(value)}
            </p>
        </div>
    );
}
