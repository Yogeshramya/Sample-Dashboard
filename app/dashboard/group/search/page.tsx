"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Group } from "@/types/group";

export default function SearchGroup() {
    const [results, setResults] = useState<Group[]>([]);
    const [error, setError] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmp, setSelectedEmp] = useState("");
    const [clientCounts, setClientCounts] = useState<Record<string, number>>({});

    // Load employees
    useEffect(() => {
        fetch("/api/employees/list")
            .then((res) => res.json())
            .then((data) => setEmployees(data.employees || []));
    }, []);

    useEffect(() => {
        async function loadClientCounts() {
            if (results.length === 0) return;

            const counts: Record<string, number> = {};

            await Promise.all(
                results.map(async (group) => {
                    try {
                        const res = await fetch(
                            `/api/clients?groupId=${group._id}`
                        );
                        const data = await res.json();

                        if (res.ok && Array.isArray(data.clients)) {
                            counts[group._id] = data.clients.length;
                        } else {
                            counts[group._id] = 0;
                        }
                    } catch {
                        counts[group._id] = 0;
                    }
                })
            );

            setClientCounts(counts);
        }

        loadClientCounts();
    }, [results]);


    // Helper → extract name from Employee | string | null
    const getEmployeeName = (emp: Employee | string | null | undefined) => {
        if (!emp) return "-";
        return typeof emp === "string"
            ? employees.find((e) => e._id === emp)?.name || emp
            : emp.name;
    };

    // Helper → extract branch name
    const getBranchName = (branch: Branch | string | null | undefined) => {
        if (!branch) return "-";
        return typeof branch === "string" ? branch : branch.name;
    };

    const handleSearchByEmployee = async () => {
        setResults([]);
        setError("");

        if (!selectedEmp) {
            setError("Please select an employee!");
            return;
        }

        const res = await fetch(`/api/group/search?query=${selectedEmp}`);
        const data = await res.json();

        if (!res.ok || !Array.isArray(data) || data.length === 0) {
            setError("No groups found for selected employee");
            return;
        }

        setResults(data);
    };

    return (
        <section className="max-w-7xl mx-auto space-y-6 p-6">
            <PageHeader />

            <h1 className="text-2xl font-bold">Search Center</h1>

            {/* Employee Search */}
            <div className="space-y-4">
                <label className="font-semibold text-sm">Search by Employee</label>

                <div className="flex gap-4">
                    <Select onValueChange={(v) => setSelectedEmp(v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map((emp) => (
                                <SelectItem key={emp._id} value={emp._id}>
                                    {emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={handleSearchByEmployee}>
                        Search Centers
                    </Button>
                </div>
            </div>

            {error && <p className="text-red-500">{error}</p>}

            {/* Results */}
            {results.length > 0 && (
                <div className="overflow-x-auto border rounded-md mt-4 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-3">Center ID</th>
                                <th className="p-3">Center Name</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Collection Employee</th>
                                <th className="p-3">Created Employee</th>
                                <th className="p-3">Collection Day</th>
                                <th className="p-3">Collection Time</th>
                                <th className="p-3">Clients</th>
                                <th className="p-3">Due On</th>
                                <th className="p-3 text-center">Copy</th>
                            </tr>
                        </thead>

                        <tbody>
                            {results.map((group: Group) => (
                                <tr
                                    key={group._id}
                                    className="border-t hover:bg-gray-50 transition"
                                >
                                    <td className="p-3 font-medium">
                                        {group.groupId}
                                    </td>

                                    <td className="p-3">
                                        {group.groupName}
                                    </td>

                                    <td className="p-3">
                                        {getBranchName(group.branch)}
                                    </td>

                                    <td className="p-3">
                                        {getEmployeeName(group.employee)}
                                    </td>

                                    <td className="p-3">
                                        {getEmployeeName(group.createdBy)}
                                    </td>

                                    <td className="p-3">
                                        {group.collectionDay}
                                    </td>

                                    <td className="p-3">
                                        {group.collectionTime || "-"}
                                    </td>

                                    <td className="p-3">
                                        {clientCounts[group._id] ?? "Loading..."}
                                    </td>

                                    <td className="p-3">
                                        {group.dueOn}
                                    </td>

                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(group.groupId);
                                                toast.success("Center ID copied!");
                                            }}
                                            className="inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-200 transition"
                                        >
                                            <Copy className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}