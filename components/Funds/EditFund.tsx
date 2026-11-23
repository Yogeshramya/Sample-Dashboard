"use client";

import { useEffect, useState, useCallback } from "react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import { toast } from "sonner";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading"; // Imported the loading overlay

import { Group } from "@/types/group";
import { Loan } from "@/types/fund";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

/* ================= PAGE ================= */

export default function LoanSearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState(
        searchParams.get("employee") || ""
    );

    const [selectedGroup, setSelectedGroup] = useState(
        searchParams.get("group") || ""
    );

    const [loadingLoans, setLoadingLoans] = useState(false);
    const [triedLoading, setTriedLoading] = useState(false);

    /* ================= PERSIST URL ================= */

    useEffect(() => {
        const params = new URLSearchParams();

        if (selectedEmployee) {
            params.set("employee", selectedEmployee);
        }

        if (selectedGroup) {
            params.set("group", selectedGroup);
        }

        router.replace(`?${params.toString()}`, {
            scroll: false,
        });
    }, [selectedEmployee, selectedGroup, router]);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        let isMounted = true;

        async function loadEmployees() {
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

        loadEmployees();

        return () => {
            isMounted = false;
        };
    }, []);

    /* ================= LOAD GROUPS ================= */

    useEffect(() => {
        let isMounted = true;

        async function loadGroups() {
            if (!selectedEmployee) {
                if (isMounted) setGroups([]);
                return;
            }

            try {
                const res = await fetch(
                    `/api/group?employeeId=${selectedEmployee}&status=ACTIVE`
                );

                const data = await res.json();

                if (isMounted) {
                    setGroups(data.groups || []);
                }
            } catch {
                if (isMounted) {
                    toast.error("Failed to load groups");
                }
            }
        }

        loadGroups();

        return () => {
            isMounted = false;
        };
    }, [selectedEmployee]);

    /* ================= SEARCH LOANS ================= */

    const handleSearch = useCallback(async () => {
        if (!selectedEmployee || !selectedGroup) {
            toast.error("Select employee & center first");
            return;
        }

        setTriedLoading(true);
        setLoadingLoans(true);
        setLoans([]);

        try {
            const res = await fetch(
                `/api/fund/by-group?groupId=${selectedGroup}`
            );

            const data = await res.json();

            setLoans(data.loans || []);
        } catch {
            toast.error("Failed to load loans");
        } finally {
            setLoadingLoans(false);
        }
    }, [selectedEmployee, selectedGroup]);

    /* ================= AUTO RESTORE ================= */

    useEffect(() => {
        let isMounted = true;

        if (selectedGroup && groups.length > 0) {
            const executeSearch = async () => {
                if (isMounted) {
                    await handleSearch();
                }
            };

            executeSearch();
        }

        return () => {
            isMounted = false;
        };
    }, [selectedGroup, groups.length, handleSearch]);

    /* ================= VIEW ================= */

    function handleViewLoan(loan: Loan) {
        router.push(
            `/dashboard/fund/${loan._id}`,
            {
                scroll: false,
            }
        );
    }

    /* ================= STATUS ================= */

    function renderStatus(status: Loan["status"]) {
        const colors: Record<Loan["status"], string> = {
            APPROVED: "text-green-600",
            PENDING: "text-yellow-600",
            REPAID: "text-gray-600",
            REJECTED: "text-red-600",
            NONE: "text-gray-400",
        };

        return (
            <span className={`${colors[status] || "text-gray-600"} font-bold`}>
                {status}
            </span>
        );
    }

    /* ================= UI ================= */

    return (
        <section className="max-w-7xl mx-auto space-y-10 relative">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loadingLoans} />

            <PageHeader />

            <h1 className="text-3xl font-bold text-blue-600">
                SEARCH LOAN
            </h1>

            {/* FILTERS */}

            <div className="flex flex-wrap gap-4">

                {/* Employee */}

                <div>
                    <p className="font-semibold mb-1">
                        Employee :
                    </p>

                    <Select
                        value={selectedEmployee}
                        onValueChange={(value) => {
                            setSelectedEmployee(value);
                            setSelectedGroup("");
                            setLoans([]);
                            setTriedLoading(false);
                        }}
                    >
                        <SelectTrigger className="w-70">
                            <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>

                        <SelectContent>
                            {employees.map((emp) => (
                                <SelectItem
                                    key={emp._id}
                                    value={emp._id}
                                >
                                    {emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Group */}

                <div>
                    <p className="font-semibold mb-1">
                        Center :
                    </p>

                    <Select
                        value={selectedGroup}
                        disabled={!selectedEmployee}
                        onValueChange={(value) => {
                            setSelectedGroup(value);
                            setLoans([]);
                            setTriedLoading(false);
                        }}
                    >
                        <SelectTrigger className="w-70">
                            <SelectValue
                                placeholder={
                                    selectedEmployee
                                        ? "Select Center"
                                        : "Select Employee First"
                                }
                            />
                        </SelectTrigger>

                        <SelectContent>
                            {groups.length > 0 ? (
                                groups.map((g) => (
                                    <SelectItem
                                        key={g._id}
                                        value={g._id}
                                    >
                                        {g.groupName} ({g.groupId})
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="text-gray-500 text-center py-2 text-sm">
                                    No groups
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Search */}

                <div className="flex items-end">
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleSearch}
                        disabled={
                            !selectedEmployee ||
                            !selectedGroup ||
                            loadingLoans
                        }
                    >
                        {loadingLoans
                            ? "Searching..."
                            : "Search Loans"}
                    </Button>
                </div>
            </div>

            {/* RESULTS */}

            {loans.length > 0 ? (
                <div className="border rounded-lg mt-10 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th className="p-3 border">
                                    Action
                                </th>

                                <th className="p-3 border">
                                    Loan ID
                                </th>

                                <th className="p-3 border">
                                    Customer
                                </th>

                                <th className="p-3 border">
                                    Phone
                                </th>

                                <th className="p-3 border">
                                    Amount
                                </th>

                                <th className="p-3 border">
                                    Status
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loans.map((loan) => (
                                <tr
                                    key={loan._id}
                                    className="hover:bg-gray-100"
                                >
                                    <td className="p-3 border text-center">
                                        <span
                                            className="text-blue-600 underline cursor-pointer"
                                            onClick={() =>
                                                handleViewLoan(loan)
                                            }
                                        >
                                            View
                                        </span>
                                    </td>

                                    <td className="p-3 border text-center font-mono">
                                        {loan.mfLoanId}
                                    </td>

                                    <td className="p-3 border">
                                        {loan.customer?.name || "-"}
                                    </td>

                                    <td className="p-3 border text-center">
                                        {loan.customer?.phone || "-"}
                                    </td>

                                    <td className="p-3 border text-center font-semibold">
                                        ₹
                                        {loan.loanAmount ||
                                            loan.principal ||
                                            0}
                                    </td>

                                    <td className="p-3 border text-center font-bold">
                                        {renderStatus(loan.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                triedLoading &&
                !loadingLoans && (
                    <p className="mt-8 text-center text-gray-500 font-medium">
                        No loans found in this group.
                    </p>
                )
            )}
        </section>
    );
}