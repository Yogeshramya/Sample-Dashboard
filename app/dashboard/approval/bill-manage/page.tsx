"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Group } from "@/types/group";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

interface BillLoanItem {
    loanId: string;
    customerName: string;
    weekNo: number;
    paidAmount: number;
    principal: number;
    interest: number;
    savings: number;
    present: boolean;
}

interface Bill {
    _id: string;
    employeeId: string;
    group: Group;
    weekNo: number;
    totalCollected: number;
    status: "PENDING" | "APPROVED";
    collectedAt: string;
    loans: BillLoanItem[];
}

/* ================= PAGE ================= */

export default function ManageBillsPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("ALL");

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState("ALL");

    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        let isMounted = true;
        fetch("/api/employees/list")
            .then((r) => r.json())
            .then((d) => {
                if (isMounted) setEmployees(d.employees || []);
            })
            .catch(() => toast.error("Failed to load employees"));

        return () => {
            isMounted = false;
        };
    }, []);

    /* ================= FETCH GROUPS ================= */

    useEffect(() => {
        if (employeeId === "ALL") return;

        let isMounted = true;
        fetch(`/api/group/search?query=${employeeId}&status=ACTIVE`)
            .then((r) => r.json())
            .then((data) => {
                if (isMounted) setGroups(Array.isArray(data) ? data : []);
            })
            .catch(() => toast.error("Failed to load centers"));

        return () => {
            isMounted = false;
        };
    }, [employeeId]);

    /* ================= FETCH BILLS ================= */

    const loadBillsData = useCallback(async (showLoadingSpinner = false) => {
        if (showLoadingSpinner) setLoading(true);

        try {
            const status = "APPROVED";
            const type = "Normal";

            let url = `/api/bill/list?status=${status}&type=${type}`;
            if (employeeId !== "ALL") url += `&employeeId=${employeeId}`;
            if (selectedGroupId !== "ALL") url += `&groupId=${selectedGroupId}`;

            const res = await fetch(url);
            const data = await res.json();
            setBills(data.bills || []);
        } catch {
            toast.error("Failed to fetch bills");
        } finally {
            if (showLoadingSpinner) setLoading(false);
        }
    }, [employeeId, selectedGroupId]);

    useEffect(() => {
        let ignore = false;

        async function initFetch() {
            setLoading(true);
            try {
                const status = "APPROVED";
                const type = "Normal";

                let url = `/api/bill/list?status=${status}&type=${type}`;
                if (employeeId !== "ALL") url += `&employeeId=${employeeId}`;
                if (selectedGroupId !== "ALL") url += `&groupId=${selectedGroupId}`;

                const res = await fetch(url);
                const data = await res.json();
                if (!ignore) {
                    setBills(data.bills || []);
                }
            } catch {
                if (!ignore) toast.error("Failed to fetch bills");
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        initFetch();

        return () => {
            ignore = true;
        };
    }, [employeeId, selectedGroupId]);

    /* ================= HANDLERS ================= */

    const handleEmployeeChange = (v: string) => {
        setEmployeeId(v);
        setSelectedGroupId("ALL");
        if (v === "ALL") {
            setGroups([]);
        }
    };

    // 1. Approve Bill
    async function handleApprove(billId: string) {
        setActionLoading(billId);
        try {
            const res = await fetch(`/api/bill/${billId}/approve`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Bill approved successfully!");
                await loadBillsData();
            } else {
                toast.error(data.error || "Failed to approve bill");
            }
        } catch {
            toast.error("Error approving bill");
        } finally {
            setActionLoading(null);
        }
    }

    // 2. Undo Approval
    async function handleUndo(billId: string) {
        if (!confirm("Are you sure you want to undo approval? This will revert all paid dues.")) return;

        setActionLoading(billId);
        try {
            const res = await fetch(`/api/bill/${billId}/undo`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Approval undone! Bill reverted to pending.");
                await loadBillsData();
            } else {
                toast.error(data.error || "Failed to undo approval");
            }
        } catch {
            toast.error("Error undoing approval");
        } finally {
            setActionLoading(null);
        }
    }

    // 3. Delete Bill
    async function handleDelete(billId: string) {
        if (!confirm("Are you sure you want to delete this bill?")) return;

        setActionLoading(billId);
        try {
            const res = await fetch(`/api/bill/${billId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Bill deleted successfully!");
                await loadBillsData();
            } else {
                toast.error(data.error || "Failed to delete bill");
            }
        } catch {
            toast.error("Error deleting bill");
        } finally {
            setActionLoading(null);
        }
    }

    /* ================= UI ================= */

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <PageHeader />
            <h1 className="text-3xl font-bold text-gray-800">
                Payment Management & Modification
            </h1>

            {/* FILTERS */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Employee</label>
                        <Select
                            value={employeeId}
                            onValueChange={handleEmployeeChange}
                        >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="All Employees" />
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

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Center</label>
                        <Select
                            disabled={employeeId === "ALL"}
                            value={selectedGroupId}
                            onValueChange={setSelectedGroupId}
                        >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="All Centers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Centers</SelectItem>
                                {groups.map((g) => (
                                    <SelectItem key={g._id} value={g._id}>
                                        {g.groupName} ({g.groupId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Button
                            onClick={() => loadBillsData(true)}
                            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Refresh List
                        </Button>
                    </div>
                </div>
            </Card>

            {/* BILLS TABLE */}
            {loading ? (
                <p className="text-center py-6">Loading bills…</p>
            ) : bills.length > 0 ? (
                <Card className="p-4 overflow-auto">
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-800 text-white">
                            <tr className="text-center">
                                <th className="border p-2">Center</th>
                                <th className="border p-2">Week No</th>
                                <th className="border p-2">Total Amount</th>
                                <th className="border p-2">Collected At</th>
                                <th className="border p-2">Status</th>
                                <th className="border p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map((bill) => (
                                <tr key={bill._id} className="text-center hover:bg-gray-50">
                                    <td className="border p-2 font-semibold">
                                        {bill.group?.groupName || "-"} ({bill.group?.groupId || "-"})
                                    </td>
                                    <td className="border p-2">Week {bill.weekNo}</td>
                                    <td className="border p-2 font-bold text-blue-700">
                                        ₹{bill.totalCollected}
                                    </td>
                                    <td className="border p-2">
                                        {new Date(bill.collectedAt).toLocaleDateString()}
                                    </td>
                                    <td className="border p-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold ${bill.status === "APPROVED"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-800"
                                                }`}
                                        >
                                            {bill.status}
                                        </span>
                                    </td>
                                    <td className="border p-2">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedBill(bill)}
                                            >
                                                Details
                                            </Button>

                                            {bill.status === "PENDING" ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        disabled={actionLoading === bill._id}
                                                        onClick={() => handleApprove(bill._id)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={actionLoading === bill._id}
                                                        onClick={() => handleDelete(bill._id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                                    disabled={actionLoading === bill._id}
                                                    onClick={() => handleUndo(bill._id)}
                                                >
                                                    Undo Approval
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <p className="text-center text-gray-500 py-6">No bills found</p>
            )}

            {/* DETAILS MODAL */}
            {selectedBill && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4 bg-white">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-xl font-bold">Bill Details</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBill(null)}
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="text-sm space-y-1">
                            <p><strong>Center:</strong> {selectedBill.group?.groupName}</p>
                            <p><strong>Week:</strong> {selectedBill.weekNo}</p>
                            <p><strong>Total Amount:</strong> ₹{selectedBill.totalCollected}</p>
                            <p><strong>Status:</strong> {selectedBill.status}</p>
                        </div>

                        <table className="w-full text-xs border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border p-2">Customer</th>
                                    <th className="border p-2">Loan ID</th>
                                    <th className="border p-2">Amount Paid</th>
                                    <th className="border p-2">Present</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedBill.loans.map((item, idx) => (
                                    <tr key={idx} className="text-center">
                                        <td className="border p-2">{item.customerName}</td>
                                        <td className="border p-2">{item.loanId}</td>
                                        <td className="border p-2 font-semibold">₹{item.paidAmount}</td>
                                        <td className="border p-2">{item.present ? "Yes" : "No"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setSelectedBill(null)}>Close</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}