"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Group } from "@/types/group";
import { Dues, Loan } from "@/types/fund";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

interface PreBillLoan extends Loan {
    isPresent: boolean;
}

/* ================= PAGE ================= */

export default function PreBillPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");

    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
    const [selectedDay, setSelectedDay] = useState("ALL");
    const [selectedGroup, setSelectedGroup] = useState("");

    const [loans, setLoans] = useState<PreBillLoan[]>([]);
    const [weeks, setWeeks] = useState<number[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        fetch("/api/employees/list")
            .then((res) => res.json())
            .then((data) => setEmployees(data.employees || []))
            .catch(() => toast.error("Failed to load employees"));
    }, []);

    /* ================= LOAD GROUPS ================= */

    async function fetchGroups(empId: string) {
        setEmployeeId(empId);
        setAllGroups([]);
        setFilteredGroups([]);
        setSelectedDay("ALL");
        setSelectedGroup("");
        setLoans([]);
        setWeeks([]);
        setSelectedWeek(null);

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
        setSelectedGroup("");
        setLoans([]);
        setWeeks([]);
        setSelectedWeek(null);

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
        setSelectedGroup(groupId);

        try {
            const res = await fetch(`/api/fund/by-group?groupId=${groupId}`);
            const data = await res.json();

            const loanList = Array.isArray(data.loans) ? data.loans : [];
            setLoans(loanList);

            if (loanList.length === 0) {
                toast.error("No customers found in this center!");
                setWeeks([]);
                setSelectedWeek(null);
                return;
            }

            const maxWeeks = loanList[0]?.dues?.length || 0;
            setWeeks([...Array(maxWeeks).keys()].map((i) => i + 1));

            const paidCount = loanList[0]?.dues?.filter((d: Dues) => d.paid)?.length || 0;
            const nextWeek = paidCount + 1;

            setSelectedWeek(nextWeek);
            updatePayCheckboxes(nextWeek, loanList);
        } catch {
            toast.error("Failed to load loans");
        }
    }

    /* ================= LOAN TOGGLES & UPDATES ================= */

    function updatePayCheckboxes(week: number, data = loans) {
        if (!Array.isArray(data)) return;

        const weekIdx = week - 1;

        setLoans(
            data.map((l) => {
                const due = l.dues?.[weekIdx];

                return {
                    ...l,
                    isPaying: false,
                    isPresent: due?.present ?? true,
                    dueAmount: Number(due?.total || 0),
                    principal: Number(due?.principal || 0),
                    interest: Number(due?.interest || 0),
                    savings: Number(due?.savings || 0),
                    payAmount: 0,
                };
            })
        );
    }

    const togglePresence = (index: number) => {
        const updated = [...loans];
        updated[index].isPresent = !updated[index].isPresent;

        // Absent → auto unselect payment
        if (!updated[index].isPresent) {
            updated[index].isPaying = false;
            updated[index].payAmount = 0;
        }

        setLoans(updated);
    };

    const togglePayStatus = (index: number) => {
        const updated = [...loans];
        const l = updated[index];

        l.isPaying = !l.isPaying;
        l.payAmount = l.isPaying ? l.dueAmount : 0;

        setLoans(updated);
    };

    /* ================= TOTAL ================= */

    const totalToCollect = Array.isArray(loans)
        ? loans.reduce((sum, l) => sum + Number(l.payAmount || 0), 0)
        : 0;

    /* ================= SUBMIT ================= */

    async function submit() {
        if (!selectedWeek) return toast.error("Select Week!");

        if (totalToCollect === 0)
            return toast.error("Select at least one member!");

        const loansData = loans
            .filter((l) => l.isPaying)
            .map((l) => ({
                loanId: l.mfLoanId,
                customerName: l.customer?.name || "",
                weekNo: selectedWeek,
                paidAmount: l.payAmount,
                principal: l.principal,
                interest: l.interest,
                savings: l.savings,
                present: l.isPresent,
            }));

        const res = await fetch("/api/bill/prebill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employeeId,
                groupId: selectedGroup,
                loans: loansData,
                weekNo: selectedWeek,
                totalCollected: totalToCollect,
            }),
        });

        if (res.ok) {
            toast.success("Pre-Payment Submitted Successfully!");
            router.push("/dashboard/bill");
        } else {
            toast.error("Saving Failed!");
        }
    }

    /* ================= UI ================= */

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <PageHeader />
            <h1 className="text-3xl font-bold text-purple-600">Pre-Payment Management</h1>

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
                                {employees.map((emp) => (
                                    <SelectItem key={emp._id} value={emp._id}>
                                        {emp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. COLLECTION DAY (Enabled after Employee selection) */}
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

                    {/* 3. CENTER / GROUP (Filtered by selected employee & day) */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">
                            Center
                        </label>
                        <Select
                            disabled={!employeeId || filteredGroups.length === 0}
                            value={selectedGroup}
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

            {/* Loans Table */}
            {loans.length > 0 && selectedGroup && (
                <Card className="p-6 space-y-5 overflow-auto">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-lg">Members</p>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 font-medium">Select Week:</span>
                            <Select
                                value={selectedWeek?.toString()}
                                onValueChange={(v) => {
                                    const week = Number(v);
                                    setSelectedWeek(week);
                                    updatePayCheckboxes(week);
                                }}
                            >
                                <SelectTrigger className="w-36 h-10">
                                    <SelectValue placeholder="Select Week" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weeks.map((w) => (
                                        <SelectItem key={w} value={w.toString()}>
                                            Week {w}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="overflow-auto rounded border">
                        <table className="w-full text-sm">
                            <thead className="bg-purple-600 text-white">
                                <tr>
                                    <th className="p-2 border">Status</th>
                                    <th className="p-2 border">Select</th>
                                    <th className="p-2 border">Name</th>
                                    <th className="p-2 border">Principal</th>
                                    <th className="p-2 border">Interest</th>
                                    <th className="p-2 border">Savings</th>
                                    <th className="p-2 border">Total</th>
                                    <th className="p-2 border">Pay</th>
                                    <th className="p-2 border">Present</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map((l, i) => {
                                    const weekIdx = (selectedWeek || 1) - 1;
                                    const isPaid = l.dues?.[weekIdx]?.paid;

                                    return (
                                        <tr key={l._id} className="text-center hover:bg-gray-50">
                                            <td className={`border p-2 font-medium ${isPaid ? "text-green-600" : "text-red-600"}`}>
                                                {isPaid ? "PAID" : "PENDING"}
                                            </td>
                                            <td className="border p-2">
                                                {!isPaid ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={l.isPaying}
                                                        onChange={() => togglePayStatus(i)}
                                                    />
                                                ) : "—"}
                                            </td>
                                            <td className="border p-2 font-semibold">{l.customer?.name}</td>
                                            <td className="border p-2">₹{l.principal}</td>
                                            <td className="border p-2">₹{l.interest}</td>
                                            <td className="border p-2">₹{l.savings}</td>
                                            <td className="border p-2 font-semibold">₹{l.dueAmount}</td>
                                            <td className="border p-2 font-bold text-purple-700">₹{l.payAmount}</td>
                                            <td className="border p-2">
                                                {!isPaid ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={l.isPresent}
                                                        onChange={() => togglePresence(i)}
                                                    />
                                                ) : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Summary + Submit */}
            {selectedGroup && selectedWeek && loans.length > 0 && (
                <Card className="p-6 space-y-3 max-w-sm">
                    <p className="font-semibold text-lg">Summary</p>

                    <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Pre-Payment:</span>
                        <span className="font-bold text-purple-700 text-xl">₹{totalToCollect}</span>
                    </div>

                    <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-2"
                        disabled={totalToCollect === 0}
                        onClick={submit}
                    >
                        Submit Pre-Payment
                    </Button>
                </Card>
            )}
        </div>
    );
}