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
import LoadingOverlay from "@/components/Loading";

import { Group } from "@/types/group";
import {
    CustomerForLoan,
    LoanStatus
} from "@/types/customer";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

/* ================= PAGE ================= */

export default function NewLoanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const [customers, setCustomers] = useState<CustomerForLoan[]>([]);

    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [triedLoading, setTriedLoading] = useState(false);

    const [selectedEmployee, setSelectedEmployee] = useState(
        searchParams.get("employee") || ""
    );

    const [selectedGroup, setSelectedGroup] = useState(
        searchParams.get("group") || ""
    );

    /* ---------------- Persist URL ---------------- */
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

    /* ---------------- Load Employees ---------------- */
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

    /* ---------------- Load Groups ---------------- */
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
                    toast.error("Failed to load centers");
                }
            }
        }

        loadGroups();

        return () => {
            isMounted = false;
        };
    }, [selectedEmployee]);

    /* ---------------- Load Customers ---------------- */
    const handleSubmit = useCallback(async () => {
        if (!selectedEmployee || !selectedGroup) {
            return toast.error(
                "Select employee and center first"
            );
        }

        setTriedLoading(true);
        setLoadingCustomers(true);
        setCustomers([]);

        try {
            const res = await fetch(
                `/api/clients?groupId=${selectedGroup}&status=ACTIVE`
            );

            const data = await res.json();

            const clients = data.clients || [];

            const results: CustomerForLoan[] =
                await Promise.all(
                    clients.map(async (cust: CustomerForLoan) => {
                        const r = await fetch(
                            `/api/fund/customer?customerId=${cust._id}`
                        );

                        const d = await r.json();

                        const status: LoanStatus =
                            (d.activeLoan?.status as LoanStatus) || (d.latestLoan?.status as LoanStatus) || (d.loan?.status as LoanStatus) || "NONE";

                        return {
                            _id: cust._id,
                            customerCode: cust.customerCode,
                            name: cust.name,
                            phone: cust.phone,
                            loanStatus: status,
                        };
                    })
                );

            setCustomers(results);
        } catch {
            toast.error("Failed to load customers");
        } finally {
            setLoadingCustomers(false);
        }
    }, [selectedEmployee, selectedGroup]);

    /* ---------------- Auto Restore ---------------- */
    useEffect(() => {
        let isMounted = true;

        if (selectedGroup && groups.length > 0) {
            const executeLoad = async () => {
                if (isMounted) {
                    await handleSubmit();
                }
            };

            executeLoad();
        }

        return () => {
            isMounted = false;
        };
    }, [selectedGroup, groups.length, handleSubmit]);

    /* ---------------- Navigate ---------------- */
    function handleSelectCustomer(c: CustomerForLoan) {
        router.push(
            `/dashboard/fund/provide/${c._id}`,
            {
                scroll: false,
            }
        );
    }

    /* ---------------- Status Badge ---------------- */
    function renderStatusBadge(status: LoanStatus) {
        const styles: Record<LoanStatus, string> = {
            REPAID: "text-green-600 font-bold",
            CLOSED: "text-emerald-600 font-bold",
            NONE: "text-blue-600 font-bold",
            APPROVED: "text-orange-600 font-bold",
            PENDING: "text-yellow-600 font-bold",
            REJECTED: "text-red-600 font-bold",
            ARREAR: "text-rose-600 font-bold",
        };

        return (
            <span className={styles[status] || "text-gray-600 font-bold"}>
                {status}
            </span>
        );
    }

    function canTakeLoan(status: LoanStatus) {
        return (
            status === "NONE" ||
            status === "REPAID" ||
            status === "CLOSED" ||
            status === "REJECTED"
        );
    }

    return (
        <section className="max-w-7xl mx-auto space-y-10 relative">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loadingCustomers} />

            <PageHeader />

            <h1 className="text-3xl font-bold text-orange-600">
                NEW LOAN
            </h1>

            {/* Filters */}
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
                            setCustomers([]);
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
                            {groups.length ? (
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
                                    No centers found
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-end">
                    <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleSubmit}
                        disabled={
                            !selectedEmployee ||
                            !selectedGroup ||
                            loadingCustomers
                        }
                    >
                        {loadingCustomers
                            ? "Loading..."
                            : "Load Customers"}
                    </Button>
                </div>
            </div>

            {/* Table */}
            {customers.length > 0 ? (
                <div className="mt-10 border rounded-lg overflow-x-auto shadow">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th className="p-3 border">
                                    Action
                                </th>

                                <th className="p-3 border">
                                    Customer Code
                                </th>

                                <th className="p-3 border">
                                    Name
                                </th>

                                <th className="p-3 border">
                                    Phone
                                </th>

                                <th className="p-3 border">
                                    Loan Status
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {customers.map((c) => (
                                <tr
                                    key={c._id}
                                    className="hover:bg-gray-100"
                                >
                                    <td className="p-3 border text-center">
                                        {canTakeLoan(
                                            c.loanStatus
                                        ) ? (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleSelectCustomer(c)
                                                }
                                            >
                                                Select
                                            </Button>
                                        ) : (
                                            <span className="text-gray-400 cursor-not-allowed">
                                                Not Allowed
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3 border text-center font-mono">
                                        {c.customerCode}
                                    </td>

                                    <td className="p-3 border font-medium">
                                        {c.name}
                                    </td>

                                    <td className="p-3 border text-center">
                                        {c.phone}
                                    </td>

                                    <td className="p-3 border text-center">
                                        {renderStatusBadge(
                                            c.loanStatus
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                triedLoading &&
                !loadingCustomers && (
                    <p className="mt-6 text-center text-gray-500">
                        No customers found in this center.
                    </p>
                )
            )}
        </section>
    );
}