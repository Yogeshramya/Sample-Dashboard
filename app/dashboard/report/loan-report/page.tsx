"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getTodayIST } from "@/lib/ist";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Loan } from "@/types/fund";

export default function FundReportPage() {
    const { data: session } = useSession();
    const isTeller = session?.user?.role === "TELLER";

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(false);
    const [scheme, setScheme] = useState("ALL");

    useEffect(() => {
        if (isTeller) {
            const today = getTodayIST();
            setFromDate(today);
            setToDate(today);
        }
    }, [isTeller]);

    const setQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
        if (isTeller) return;
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (type === "TODAY") {
            // start/end are already now
        } else if (type === "WEEK") {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        } else if (type === "MONTH") {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        }

        const format = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setFromDate(format(start));
        setToDate(format(end));
    };

    const fetchReport = useCallback(async () => {
        const queryFrom = isTeller ? (fromDate || getTodayIST()) : fromDate;
        const queryTo = isTeller ? (toDate || getTodayIST()) : toDate;

        if (!queryFrom || !queryTo) {
            toast.error("Please select a date range");
            return;
        }

        setLoading(true);

        let url = `/api/fund/report?from=${queryFrom}&to=${queryTo}`;

        if (scheme !== "ALL") {
            url += `&loanAmount=${scheme}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.success) {
                toast.error("Failed to fetch report");
                setLoading(false);
                return;
            }

            setLoans(data.loans || []);
        } catch {
            toast.error("Failed to fetch report");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, isTeller, scheme]);

    useEffect(() => {
        if (isTeller && fromDate && toDate) {
            void fetchReport();
        }
    }, [isTeller, fromDate, toDate, fetchReport]);

    const totalLoanAmount = loans.reduce(
        (sum, loan) => sum + (loan.loanAmount || 0),
        0
    );

    const openPassbook = (loanId: string) => {
        window.open(`/api/passbook/print/${loanId}`, "_blank");
    };

    // Redirection handler for the Loan Credit Form
    const openCreditForm = (loanId: string) => {
        window.open(`/api/loancreditform/print/${loanId}`, "_blank");
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader />
            <h1 className="text-2xl font-bold">Fund Provide Report</h1>

            {/* Date Picker */}
            <div className="bg-white p-6 rounded-xl shadow space-y-4">
                {!isTeller && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setQuickFilter("TODAY")}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickFilter("WEEK")}>This Week</Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickFilter("MONTH")}>This Month</Button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isTeller ? (
                        <div className="md:col-span-2 flex items-center p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-slate-700 text-sm font-medium">
                            Report date: Today (IST)
                        </div>
                    ) : (
                        <>
                            <div>
                                <Label>From Date</Label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            </div>
                            <div>
                                <Label>To Date</Label>
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            </div>
                        </>
                    )}
                    <div>
                        <Label>Scheme</Label>

                        <select
                            value={scheme}
                            onChange={(e) => setScheme(e.target.value)}
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="ALL">All Schemes</option>
                            <option value="10000">10,000</option>
                            <option value="12000">12,000</option>
                            <option value="15000">15,000</option>
                            <option value="20000">20,000</option>
                        </select>
                    </div>
                </div>

                <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={fetchReport}
                    disabled={loading}
                >
                    {loading ? "Generating..." : "Generate Report"}
                </Button>
            </div>

            {/* STATS */}
            {loans.length > 0 && (
                <div className="bg-green-50 border border-green-300 text-green-700 p-4 rounded-lg">
                    <p className="font-bold">Total Loans Provided: {loans.length}</p>
                    <p className="font-bold">
                        Total Loan Amount: ₹{totalLoanAmount.toLocaleString()}
                    </p>
                </div>
            )}

            {/* REPORT TABLE */}
            {loans.length > 0 && (
                <div className="overflow-auto rounded-lg shadow mt-4">
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="p-2 border">Loan ID</th>
                                <th className="p-2 border">Customer</th>
                                <th className="p-2 border">Phone</th>
                                <th className="p-2 border">Center</th>
                                <th className="p-2 border">Loan Amount</th>
                                <th className="p-2 border">Status</th>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">Created By</th>
                                <th className="p-2 border">Collection By</th>
                                <th className="p-2 border">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loans.map((loan) => (
                                <tr key={loan._id} className="text-center">
                                    <td className="p-2 border">{loan.mfLoanId}</td>

                                    <td className="p-2 border">
                                        {loan.customer?.name ?? "-"}
                                    </td>

                                    <td className="p-2 border">
                                        {loan.customer?.phone ?? loan.phone}
                                    </td>

                                    <td className="p-2 border">
                                        {loan.group?.groupName ?? "-"}
                                    </td>

                                    <td className="p-2 border font-bold">
                                        ₹{loan.loanAmount.toLocaleString()}
                                    </td>
                                    <td
                                        className={`p-2 border ${loan.status === "APPROVED"
                                            ? "text-green-600 font-semibold"
                                            : loan.status === "PENDING"
                                                ? "text-yellow-600 font-semibold"
                                                : "text-red-600 font-semibold"
                                            }`}
                                    >
                                        {loan.status}
                                    </td>
                                    <td className="p-2 border">
                                        {new Date(loan.loanDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-2 border font-bold">
                                        {loan.group?.createdBy?.name ?? "-"}
                                    </td>

                                    <td className="p-2 border font-bold">
                                        {loan.group?.employee?.name ?? "-"}
                                    </td>

                                    {/* ACTION CELL: Split into dual printing workflows */}
                                    <td className="p-2 border">
                                        <div className="flex gap-2 justify-center items-center">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => openPassbook(loan._id)}
                                            >
                                                Print Passbook
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-purple-600 text-purple-600 hover:bg-purple-50"
                                                onClick={() => openCreditForm(loan._id)}
                                            >
                                                Credit Form
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}