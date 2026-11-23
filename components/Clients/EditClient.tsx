"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import PageHeader from "@/components/PageHeader";
import LoadingOverlay from "@/components/Loading"; // Imported the loading overlay
import { Group } from "@/types/group";
import { Customer } from "@/types/customer";

interface Employee {
    _id: string;
    name: string;
}

export default function ManageClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [clients, setClients] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState(
        searchParams.get("employee") || ""
    );

    const [selectedGroup, setSelectedGroup] = useState(
        searchParams.get("group") || ""
    );

    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

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

    /* ---------------- Search Clients ---------------- */
    const searchClients = useCallback(async () => {
        if (!selectedGroup) return;

        setLoading(true);
        setSearched(true);

        try {
            const url = `/api/clients?groupId=${selectedGroup}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setClients(data.clients || []);
            } else {
                setClients([]);
            }
        } catch {
            toast.error("Failed to fetch customers");
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    /* ---------------- Auto Restore ---------------- */
    useEffect(() => {
        let isMounted = true;

        if (selectedGroup && groups.length > 0) {
            const executeSearch = async () => {
                if (isMounted) {
                    await searchClients();
                }
            };

            executeSearch();
        }

        return () => {
            isMounted = false;
        };
    }, [selectedGroup, groups.length, searchClients]);

    /* ---------------- Delete ---------------- */
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;

        try {
            const res = await fetch(`/api/clients/${id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Customer Deleted");

                setClients((prev) =>
                    prev.filter((c) => c._id !== id)
                );
            } else {
                toast.error(
                    json.error || "Failed to delete customer"
                );
            }
        } catch {
            toast.error("Failed to delete customer");
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 relative">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <PageHeader />

            <h1 className="text-xl sm:text-2xl font-bold">
                Modify / Remove Customer
            </h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                {/* Employee */}
                <Select
                    value={selectedEmployee}
                    onValueChange={(value) => {
                        setSelectedEmployee(value);
                        setSelectedGroup("");
                        setClients([]);
                    }}
                >
                    <SelectTrigger className="w-65">
                        <SelectValue placeholder="Employee" />
                    </SelectTrigger>

                    <SelectContent>
                        {employees.map((e) => (
                            <SelectItem
                                key={e._id}
                                value={e._id}
                            >
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Group */}
                <Select
                    value={selectedGroup}
                    disabled={!selectedEmployee}
                    onValueChange={setSelectedGroup}
                >
                    <SelectTrigger className="w-65">
                        <SelectValue placeholder="Group" />
                    </SelectTrigger>

                    <SelectContent>
                        {groups.map((g) => (
                            <SelectItem
                                key={g._id}
                                value={g._id}
                            >
                                {g.groupName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    onClick={searchClients}
                    disabled={!selectedGroup || loading}
                >
                    {loading
                        ? "Loading..."
                        : "Apply Filters"}
                </Button>
            </div>

            {/* Results */}
            {clients.length > 0 && (
                <Card className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-3">
                                    Customer Code
                                </th>

                                <th className="p-3">
                                    Name
                                </th>

                                <th className="p-3">
                                    Phone
                                </th>

                                <th className="p-3">
                                    Status
                                </th>

                                <th className="p-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {clients.map((client) => (
                                <tr
                                    key={client._id}
                                    className="border-t hover:bg-gray-50 transition"
                                >
                                    <td className="p-3 font-medium">
                                        {client.customerCode}
                                    </td>

                                    <td className="p-3">
                                        {client.name}
                                    </td>

                                    <td className="p-3">
                                        {client.phone}
                                    </td>

                                    <td
                                        className={`p-3 font-medium ${client.status === "CLOSED"
                                            ? "text-red-500"
                                            : "text-green-600"
                                            }`}
                                    >
                                        {client.status}
                                    </td>

                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/client/${client._id}`,
                                                        {
                                                            scroll: false,
                                                        }
                                                    )
                                                }
                                            >
                                                View
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/client/${client._id}/edit`,
                                                        {
                                                            scroll: false,
                                                        }
                                                    )
                                                }
                                            >
                                                Edit
                                            </Button>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(
                                                        client._id
                                                    )
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Empty */}
            {searched &&
                clients.length === 0 &&
                !loading && (
                    <p className="text-center text-gray-500 py-6">
                        No customers found
                    </p>
                )}
        </div>
    );
}