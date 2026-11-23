"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Group } from "@/types/group";
import { Customer } from "@/types/customer";
import LoadingOverlay from "@/components/Loading"; // Imported the loading overlay

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

/* ================= PAGE ================= */

export default function SearchGroupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [employees, setEmployees] = useState<Employee[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState(
        searchParams.get("employee") || ""
    );

    const [groups, setGroups] = useState<Group[]>([]);

    const [selectedGroup, setSelectedGroup] = useState(
        searchParams.get("group") || ""
    );

    const [results, setResults] = useState<Customer[]>([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    /* --------------------- Persist URL State --------------------- */
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

    /* --------------------- Load Employees --------------------- */
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

    /* --------------------- Load Groups --------------------- */
    useEffect(() => {
        let isMounted = true;

        async function loadGroups() {
            if (!selectedEmployee) {
                if (isMounted) setGroups([]);
                return;
            }

            try {
                const res = await fetch(
                    `/api/group/search?query=${selectedEmployee}`
                );

                const data = await res.json();

                if (!res.ok) {
                    if (isMounted) toast.error("Failed to load groups");
                    return;
                }

                if (isMounted) {
                    setGroups(data || []);
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

    /* --------------------- Search Clients --------------------- */
    const handleSearch = useCallback(async () => {
        if (!selectedGroup) {
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const res = await fetch(
                `/api/clients?groupId=${selectedGroup}`
            );

            const data = await res.json();

            if (!res.ok) {
                setResults([]);
                toast.error("Failed to fetch clients!");
                return;
            }

            setResults(data.clients || []);

            if (!data.clients?.length) {
                toast.warning("No clients found!");
            }
        } catch {
            toast.error("Failed to fetch clients!");
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    /* --------------------- Auto Restore Results --------------------- */
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

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            <PageHeader />

            <h1 className="text-2xl font-bold">
                Search Customer (Employee → Center)
            </h1>

            {/* Employee Selection */}
            <div className="flex gap-3">
                <Select
                    value={selectedEmployee}
                    onValueChange={(value) => {
                        setSelectedEmployee(value);
                        setSelectedGroup("");
                        setResults([]);
                        setSearched(false);
                    }}
                >
                    <SelectTrigger className="w-70">
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>

                    <SelectContent>
                        {employees.map((e) => (
                            <SelectItem key={e._id} value={e._id}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Group Selection */}
            <div className="flex gap-3">
                <Select
                    value={selectedGroup}
                    onValueChange={(value) => {
                        setSelectedGroup(value);
                        setResults([]);
                        setSearched(false);
                    }}
                    disabled={!groups.length}
                >
                    <SelectTrigger className="w-70">
                        <SelectValue placeholder="Select Group" />
                    </SelectTrigger>

                    <SelectContent>
                        {groups.map((g) => (
                            <SelectItem key={g._id} value={g._id}>
                                {g.groupName} ({g.groupId})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    onClick={handleSearch}
                    disabled={!selectedGroup || loading}
                >
                    {loading ? "Searching..." : "Search"}
                </Button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="overflow-x-auto border rounded-md bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-3">Customer Code</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Phone</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {results.map((client) => (
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

                                    <td className="p-3 text-right">
                                        <Button
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty */}
            {searched && results.length === 0 && !loading && (
                <p className="text-center text-gray-500 mt-8">
                    No clients found for this group.
                </p>
            )}
        </div>
    );
}