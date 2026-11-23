"use client";

import { useEffect, useState, useCallback } from "react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
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

interface Employee {
    _id: string;
    name: string;
}

interface CustomerSavings {
    customerId: string;
    name: string;
    phone: string;

    loanId?: string | null;
    loanStatus?: string | null;

    loanSavings: number;
    draftSavings: number;
    totalSavings: number;

    savingsRequested: boolean;
    savingsReturned: boolean;

    approvalStatus?:
    | "PENDING"
    | "APPROVED"
    | null;
}

export default function SavingsReturnSearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [customers, setCustomers] = useState<CustomerSavings[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState(
        searchParams.get("employee") || ""
    );

    const [selectedGroup, setSelectedGroup] = useState(
        searchParams.get("group") || ""
    );

    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

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
                    `/api/group?employeeId=${selectedEmployee}`
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

    /* ================= SEARCH ================= */

    const handleSearch = useCallback(async () => {
        if (!selectedEmployee || !selectedGroup) {
            toast.error("Select employee & center first");
            return;
        }

        setLoading(true);
        setCustomers([]);
        setSearched(true);

        try {
            const res = await fetch(
                `/api/clients/savings?groupId=${selectedGroup}`
            );

            const data = await res.json();

            if (!data.success) {
                toast.error(
                    data.error || "Failed to load savings"
                );
                return;
            }

            setCustomers(data.customers || []);
        } catch {
            toast.error("Failed to load savings");
        } finally {
            setLoading(false);
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

    /* ================= REQUEST SAVINGS RETURN ================= */

    async function handleRequestReturn(
        customerId: string,
        totalSavings: number
    ) {
        try {
            const res = await fetch("/api/savings/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    customerId,
                    savings: totalSavings,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                toast.error(data.error || "Request failed");
                return;
            }

            toast.success("Savings return requested");
            handleSearch();
        } catch {
            toast.error("Request failed");
        }
    }

    /* ================= VIEW SAVINGS ================= */

    function handleViewSavings(customerId: string) {
        router.push(`/dashboard/fund/${customerId}/savings`, {
            scroll: false,
        });
    }

    /* ================= UI ================= */

    return (
        <section className="max-w-7xl mx-auto space-y-10 relative">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <PageHeader />

            <h1 className="text-3xl font-bold text-green-600">
                SAVINGS RETURN
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
                            setCustomers([]);
                            setSearched(false);
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
                            setCustomers([]);
                            setSearched(false);
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
                            {groups.map((g) => (
                                <SelectItem
                                    key={g._id}
                                    value={g._id}
                                >
                                    {g.groupName} ({g.groupId})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Button */}
                <div className="flex items-end">
                    <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleSearch}
                        disabled={
                            !selectedEmployee ||
                            !selectedGroup ||
                            loading
                        }
                    >
                        {loading
                            ? "Searching..."
                            : "Search Savings"}
                    </Button>
                </div>
            </div>

            {/* RESULTS */}

            {customers.length > 0 ? (
                <div className="border rounded-lg mt-10 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-green-600 text-white">
                            <tr>
                                <th className="p-3 border">
                                    Action
                                </th>

                                <th className="p-3 border">
                                    Status
                                </th>

                                <th className="p-3 border">
                                    Customer
                                </th>

                                <th className="p-3 border">
                                    Phone
                                </th>

                                <th className="p-3 border">
                                    Total Savings
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {customers.map((customer) => (
                                <tr
                                    key={customer.customerId}
                                    className="hover:bg-gray-100"
                                >
                                    {/* ACTION */}

                                    <td className="p-3 border text-center space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleViewSavings(
                                                    customer.customerId
                                                )
                                            }
                                        >
                                            View
                                        </Button>

                                        {(customer.loanStatus === "REPAID" || customer.loanStatus === "CLOSED") &&
                                            !customer.approvalStatus && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() =>
                                                        handleRequestReturn(
                                                            customer.customerId,
                                                            customer.totalSavings
                                                        )
                                                    }
                                                >
                                                    Request Return
                                                </Button>
                                            )}

                                        {customer.approvalStatus === "PENDING" && (
                                            <span className="text-yellow-600 font-semibold ml-2">
                                                Requested
                                            </span>
                                        )}

                                        {customer.approvalStatus === "APPROVED" && (
                                            <span className="text-green-600 font-semibold ml-2">
                                                Paid
                                            </span>
                                        )}
                                    </td>

                                    {/* STATUS */}

                                    <td className="p-3 border text-center font-semibold">
                                        {customer.approvalStatus === "APPROVED" ? (
                                            <span className="text-green-600">
                                                Paid
                                            </span>
                                        ) : customer.approvalStatus === "PENDING" ? (
                                            <span className="text-yellow-600">
                                                Requested
                                            </span>
                                        ) : (customer.loanStatus === "REPAID" || customer.loanStatus === "CLOSED") ? (
                                            <span className="text-blue-600">
                                                Eligible
                                            </span>
                                        ) : (
                                            <span className="text-red-600">
                                                Pending
                                            </span>
                                        )}
                                    </td>

                                    {/* CUSTOMER */}

                                    <td className="p-3 border">
                                        {customer.name}
                                    </td>

                                    {/* PHONE */}

                                    <td className="p-3 border text-center">
                                        {customer.phone}
                                    </td>

                                    {/* SAVINGS */}

                                    <td className="p-3 border text-center font-semibold">
                                        ₹{customer.totalSavings.toLocaleString()}

                                        {customer.draftSavings > 0 && (
                                            <p className="text-xs text-gray-500">
                                                Draft: ₹{customer.draftSavings.toLocaleString()}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                searched &&
                !loading && (
                    <p className="text-center text-gray-500">
                        No savings pending in this group
                    </p>
                )
            )}
        </section>
    );
}