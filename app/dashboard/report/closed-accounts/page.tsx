"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Loan } from "@/types/fund";

export default function ClosedAccounts() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";

    const [loans, setLoans] = useState<Loan[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (isTeller) {
            const today = getTodayIST();
            setStartDate(today);
            setEndDate(today);
        }
    }, [isTeller]);

    const load = useCallback(async () => {
        try {
            const queryFrom = isTeller ? (startDate || getTodayIST()) : startDate;
            const queryTo = isTeller ? (endDate || getTodayIST()) : endDate;

            const url = queryFrom || queryTo
                ? `/api/report/closed-accounts?from=${queryFrom}&to=${queryTo}`
                : "/api/report/closed-accounts";

            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setLoans(data.loans);
        } catch (err) {
            console.error("Failed to load closed accounts:", err);
        }
    }, [isTeller, startDate, endDate]);

    useEffect(() => {
        load();
    }, [load]);

    const filteredLoans = useMemo(() => {
        return loans.filter((loan) => {
            if (!loan.updatedAt) return false;
            const closedDate = new Date(loan.updatedAt);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (closedDate < start) return false;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (closedDate > end) return false;
            }

            return true;
        });
    }, [loans, startDate, endDate]);

    const handleClearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    return (
        <section className="max-w-6xl mx-auto space-y-6">
            <PageHeader />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Closed Accounts</h2>

                {/* Date Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {isTeller ? (
                        <div className="text-sm font-medium text-slate-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                            Report date: Today (IST)
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="startDate" className="text-gray-600 font-medium">
                                    From:
                                </label>
                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <label htmlFor="endDate" className="text-gray-600 font-medium">
                                    To:
                                </label>
                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="text-xs text-red-600 hover:text-red-700 underline font-medium self-center"
                                >
                                    Reset
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Card className="p-4 overflow-x-auto">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border p-2">Customer</th>
                            <th className="border p-2">Phone</th>
                            <th className="border p-2">Group</th>
                            <th className="border p-2">Closed On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLoans.map((l: Loan) => (
                            <tr key={l._id}>
                                <td className="border p-2">{l.customer?.name}</td>
                                <td className="border p-2">{l.customer?.phone}</td>
                                <td className="border p-2">{l.group?.groupName}</td>
                                <td className="border p-2">
                                    {new Date(l.updatedAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredLoans.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                        {loans.length === 0
                            ? "No closed accounts found"
                            : "No accounts found for the selected date range"}
                    </p>
                )}
            </Card>
        </section>
    );
}