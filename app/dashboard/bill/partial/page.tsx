"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Group } from "@/types/group";
import { Loan } from "@/types/fund";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

/* ================= PAGE ================= */

export default function PartialBillPage() {
    const router = useRouter();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");

    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
    const [selectedDay, setSelectedDay] = useState("ALL");
    const [selectedGroupId, setSelectedGroupId] = useState("");

    const [loans, setLoans] = useState<Loan[]>([]);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        fetch("/api/employees/list")
            .then(r => r.json())
            .then(d => setEmployees(d.employees || []))
            .catch(() => toast.error("Failed to load employees"));
    }, []);

    /* ================= LOAD GROUPS ================= */

    async function fetchGroups(empId: string) {
        setEmployeeId(empId);
        setAllGroups([]);
        setFilteredGroups([]);
        setSelectedDay("ALL");
        setSelectedGroupId("");
        setLoans([]);

        try {
            const res = await fetch(`/api/group/search?query=${empId}&status=ACTIVE`);
            const data = await res.json();
            const groupsList = Array.isArray(data) ? data : [];
            setAllGroups(groupsList);
            setFilteredGroups(groupsList);
        } catch {
            toast.error("Failed to load centers");
        }
    }

    /* ================= FILTER GROUPS BY DAY ================= */

    function handleDayChange(day: string) {
        setSelectedDay(day);
        setSelectedGroupId("");
        setLoans([]);

        if (day === "ALL") {
            setFilteredGroups(allGroups);
        } else {
            setFilteredGroups(
                allGroups.filter(
                    (g) => (g.collectionDay || "").toLowerCase() === day.toLowerCase()
                )
            );
        }
    }

    /* ================= LOAD LOANS ================= */

    async function fetchLoans(groupId: string) {
        setSelectedGroupId(groupId);
        setLoans([]);

        try {
            const res = await fetch(`/api/fund/by-group?groupId=${groupId}`);
            const data = await res.json();
            setLoans(data.loans || []);
        } catch {
            toast.error("Failed to load loans");
        }
    }

    /* ================= UI ================= */

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <PageHeader />
            <h1 className="text-2xl font-bold text-orange-600">
                Partial Bill Entry
            </h1>

            {/* SELECTION CONTROLS CARD */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* 1. EMPLOYEE */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Employee
                        </label>
                        <Select value={employeeId} onValueChange={fetchGroups}>
                            <SelectTrigger className="w-full h-10">
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

                    {/* 2. COLLECTION DAY */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Collection Day
                        </label>
                        <Select
                            disabled={!employeeId}
                            value={selectedDay}
                            onValueChange={handleDayChange}
                        >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="Select Collection Day" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Days</SelectItem>
                                <SelectItem value="Monday">Monday</SelectItem>
                                <SelectItem value="Tuesday">Tuesday</SelectItem>
                                <SelectItem value="Wednesday">Wednesday</SelectItem>
                                <SelectItem value="Thursday">Thursday</SelectItem>
                                <SelectItem value="Friday">Friday</SelectItem>
                                <SelectItem value="Saturday">Saturday</SelectItem>
                                <SelectItem value="Sunday">Sunday</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. CENTER / GROUP */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Center
                        </label>
                        <Select
                            disabled={!employeeId || filteredGroups.length === 0}
                            value={selectedGroupId}
                            onValueChange={fetchLoans}
                        >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue
                                    placeholder={
                                        !employeeId
                                            ? "Select Employee First"
                                            : filteredGroups.length === 0
                                                ? "No Centers Found"
                                                : "Select Center"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredGroups.map((g) => (
                                    <SelectItem key={g._id} value={g._id}>
                                        {g.groupName} ({g.groupId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* CUSTOMERS LIST */}
            {loans.length > 0 && (
                <Card className="p-6">
                    <h2 className="font-semibold text-lg mb-4 text-gray-800">Customers</h2>

                    <div className="space-y-2">
                        {loans.map((l) => (
                            <div
                                key={l._id}
                                className="flex justify-between items-center p-3 border rounded-md cursor-pointer hover:bg-orange-50 transition-colors"
                                onClick={() =>
                                    router.push(`/dashboard/bill/partial/${l._id}`)
                                }
                            >
                                <span className="font-semibold text-gray-800">{l.customer?.name}</span>
                                <span className="text-sm text-gray-500 font-medium">
                                    Loan: {l.mfLoanId}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}