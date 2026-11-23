"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Group } from "@/types/group";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

export default function DemandSheetPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");

    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
    const [selectedDay, setSelectedDay] = useState("ALL");

    const [groupId, setGroupId] = useState("");
    const [manualDate, setManualDate] = useState("");

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        fetch("/api/employees/list")
            .then((r) => r.json())
            .then((d) => setEmployees(d.employees || []));
    }, []);

    /* ================= LOAD GROUPS ================= */

    async function loadGroups(empId: string) {
        setEmployeeId(empId);
        setGroupId("");
        setSelectedDay("ALL");
        setAllGroups([]);
        setFilteredGroups([]);

        const res = await fetch(`/api/group/search?query=${empId}&status=ACTIVE`);
        const data = await res.json();
        const groupsList = Array.isArray(data) ? data : [];

        setAllGroups(groupsList);
        setFilteredGroups(groupsList);
    }

    /* ================= FILTER GROUPS BY DAY ================= */

    function handleDayChange(day: string) {
        setSelectedDay(day);
        setGroupId("");

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

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">

            {/* ================= HEADER ================= */}

            <PageHeader />

            <h1 className="text-3xl font-bold text-orange-600">
                Demand Sheet
            </h1>

            {/* ================= SELECTION CONTROLS CARD ================= */}

            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

                    {/* 1. EMPLOYEE */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Employee
                        </label>
                        <Select value={employeeId} onValueChange={loadGroups}>
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
                            value={groupId}
                            onValueChange={(val) => setGroupId(val)}
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

            {/* ================= DATE + FETCH ================= */}

            {groupId && (
                <Card className="p-4 space-y-3">

                    <p className="font-semibold">Sheet Options</p>

                    <div className="flex items-center gap-3">

                        <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="border rounded px-3 py-2"
                        />

                        <button
                            onClick={() => {
                                if (!groupId) return;

                                window.open(
                                    `/demand-sheet/print?groupId=${groupId}&employee=${employeeId}&date=${manualDate}`,
                                    "_blank"
                                );
                            }}
                            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                        >
                            Open Demand Sheet
                        </button>

                    </div>

                </Card>
            )}
        </div>
    );
}