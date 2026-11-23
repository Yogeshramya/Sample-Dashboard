"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Loan, Dues } from "@/types/fund";
import { Receipt, CheckSquare } from "lucide-react";

/* ================= TYPES ================= */

interface Employee {
    _id: string;
    name: string;
}

interface LoanRow extends Loan {
    nextDueNo: number;
    dueAmount: number;
    principal: number;
    interest: number;
    savings: number;
    isPaying: boolean;
    isFullyPaid: boolean;
    isPresent: boolean;
    status:
    | "UNPAID"
    | "PAID"
    | "ARREAR"
    | "NOT_DUE"
    | "COMPLETED"
    | "PARTIAL";
}

/* ================= HELPERS ================= */

function getNextDueInfo(dues: Dues[]) {
    const paidCount = dues.filter((d) => d.paid).length;
    const nextDue = dues[paidCount];
    if (!nextDue) return { dueNo: null, due: null };
    return { dueNo: paidCount + 1, due: nextDue };
}

function calculateGroupWeek(group: Group) {
    if (!group?.dueStarts) return null;

    const start = new Date(group.dueStarts);
    const now = new Date();

    start.setUTCHours(0, 0, 0, 0);
    now.setUTCHours(0, 0, 0, 0);

    if (group.dueOn === "MONTHLY") {
        let months =
            (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth());

        if (now.getDate() < start.getDate()) {
            months -= 1;
        }

        return months + 1;
    }

    const diffDays = Math.floor(
        (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const weekNo = Math.floor(diffDays / 7) + 1;
    return weekNo < 1 ? 1 : weekNo;
}

function getTodayDayName() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
}

/* ================= PAGE ================= */

export default function BillCollectionPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const isEmployeeMfi = session?.user?.role === "EMPLOYEE_MFI";

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState("");

    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
    const [selectedDay, setSelectedDay] = useState("ALL");

    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [groupWeekNo, setGroupWeekNo] = useState<number | null>(null);

    const [loans, setLoans] = useState<LoanRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    /* ================= LOAD EMPLOYEES ================= */

    useEffect(() => {
        fetch("/api/employees/list")
            .then((r) => r.json())
            .then((d) => setEmployees(d.employees || []))
            .catch(() => toast.error("Failed to load employees"));
    }, []);

    /* ================= LOAD GROUPS ================= */

    async function fetchGroups(empId: string) {
        setEmployeeId(empId);
        setAllGroups([]);
        setFilteredGroups([]);
        setLoans([]);
        setSelectedGroupId("");
        setGroupWeekNo(null);

        try {
            const res = await fetch(
                `/api/group/search?query=${empId}&status=ACTIVE`
            );
            const data = await res.json();
            const groupsList = Array.isArray(data) ? data : [];
            setAllGroups(groupsList);

            if (isEmployeeMfi) {
                const today = getTodayDayName();
                setSelectedDay(today);
                setFilteredGroups(
                    groupsList.filter(
                        (g) => (g.collectionDay || "").toLowerCase() === today.toLowerCase()
                    )
                );
            } else {
                setSelectedDay("ALL");
                setFilteredGroups(groupsList);
            }
        } catch {
            toast.error("Failed to load centers");
        }
    }

    /* ================= FILTER GROUPS BY DAY ================= */

    function handleDayChange(day: string) {
        setSelectedDay(day);
        setSelectedGroupId("");
        setLoans([]);
        setGroupWeekNo(null);

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
            const groupRes = await fetch(`/api/group/${groupId}`);
            const group: Group = await groupRes.json();

            if (!group) {
                toast.error("Failed to load center");
                return;
            }

            const currentWeek = calculateGroupWeek(group);
            setGroupWeekNo(currentWeek);

            const res = await fetch(
                `/api/fund/by-group?groupId=${groupId}`
            );
            const data = await res.json();
            const loanList: Loan[] = data.loans || [];

            if (!loanList.length) {
                toast.warning("No customers in this center");
                return;
            }

            const mapped: LoanRow[] = loanList.map((l) => {
                const { dueNo, due } = getNextDueInfo(l.dues);

                let status: LoanRow["status"];

                if (!due) {
                    status = "COMPLETED";
                } else if (due.isPartial) {
                    status = "PARTIAL";
                } else if (dueNo! < currentWeek!) {
                    status = "ARREAR";
                } else if (dueNo === currentWeek) {
                    status = "UNPAID";
                } else {
                    status = "NOT_DUE";
                }

                return {
                    ...l,
                    nextDueNo: dueNo || 0,
                    dueAmount: Number(due?.total || 0),
                    principal: Number(due?.principal || 0),
                    interest: Number(due?.interest || 0),
                    savings: Number(due?.savings || 0),
                    isPaying: false,
                    isFullyPaid: status === "COMPLETED",
                    isPresent: false, // Changed: no longer automatically checked on load
                    status,
                };
            });

            setLoans(mapped);
        } catch {
            toast.error("Failed to load loans");
        }
    }

    /* ================= SELECT ALL LOGIC ================= */

    const payableLoans = useMemo(
        () => loans.filter((l) => l.status === "UNPAID" || l.status === "PARTIAL"),
        [loans]
    );

    const isAllPaying =
        payableLoans.length > 0 && payableLoans.every((l) => l.isPaying);

    const isAllPresent =
        payableLoans.length > 0 && payableLoans.every((l) => l.isPresent);

    function toggleSelectAllPay() {
        const nextState = !isAllPaying;
        setLoans((prev) =>
            prev.map((l) => {
                if (l.status === "UNPAID" || l.status === "PARTIAL") {
                    return {
                        ...l,
                        isPaying: nextState,
                        // Removed automatic isPresent assignment
                    };
                }
                return l;
            })
        );
    }

    function toggleSelectAllPresent() {
        const nextState = !isAllPresent;
        setLoans((prev) =>
            prev.map((l) => {
                if (l.status === "UNPAID" || l.status === "PARTIAL") {
                    return {
                        ...l,
                        isPresent: nextState,
                        // Removed automatic isPaying uncheck
                    };
                }
                return l;
            })
        );
    }

    /* ================= INDIVIDUAL TOGGLES ================= */

    function togglePresence(index: number) {
        const updated = [...loans];
        updated[index].isPresent = !updated[index].isPresent;
        // Removed automatic isPaying uncheck
        setLoans(updated);
    }

    function togglePay(index: number) {
        const updated = [...loans];
        updated[index].isPaying = !updated[index].isPaying;
        // Removed automatic isPresent assignment
        setLoans(updated);
    }

    /* ================= TOTAL ================= */

    const totalCollected = loans.reduce(
        (sum, l) => sum + (l.isPaying ? l.dueAmount : 0),
        0
    );

    /* ================= SUBMIT ================= */

    async function submit() {
        const selected = loans.filter((l) => l.isPaying);

        if (!selected.length)
            return toast.error("Select at least one member");

        setSubmitting(true);

        const payload = selected.map((l) => ({
            loanId: l.mfLoanId,
            customerName: l.customer?.name || "",
            weekNo: l.nextDueNo,
            paidAmount: l.dueAmount,
            principal: l.principal,
            interest: l.interest,
            savings: l.savings,
            present: l.isPresent,
        }));

        try {
            const res = await fetch("/api/bill/collect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId,
                    groupId: selectedGroupId,
                    weekNo: groupWeekNo,
                    loans: payload,
                    totalCollected,
                }),
            });

            if (res.ok) {
                toast.success("Payment collection submitted successfully");
                router.push("/dashboard/bill");
            } else {
                toast.error("Failed to submit payment collection");
            }
        } catch {
            toast.error("An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    }

    /* ================= UI ================= */

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            {/* Title Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent flex items-center gap-2.5">
                        <Receipt className="w-7 h-7 text-amber-500" />
                        Payment Collection
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        Select an employee, collection day, and center to process dues.
                    </p>
                </div>
            </div>

            {/* Selection Controls Card */}
            <Card className="rounded-2xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xs p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* 1. Employee */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Employee
                        </label>
                        <Select value={employeeId} onValueChange={fetchGroups}>
                            <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
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

                    {/* 2. Collection Day */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Collection Day
                        </label>
                        <Select
                            disabled={!employeeId || isEmployeeMfi}
                            value={selectedDay}
                            onValueChange={handleDayChange}
                        >
                            <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
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

                    {/* 3. Center / Group */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Center
                        </label>
                        <Select
                            disabled={!employeeId || filteredGroups.length === 0}
                            value={selectedGroupId}
                            onValueChange={fetchLoans}
                        >
                            <SelectTrigger className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm">
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

            {/* Members Table */}
            {loans.length > 0 && (
                <Card className="rounded-2xl border border-amber-500/20 bg-white/95 shadow-md overflow-hidden space-y-4">
                    {/* Center Week & Quick Select Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Center Week No:
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 font-bold text-xs">
                                Week {groupWeekNo}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                                (Total: {loans.length} Members)
                            </span>
                        </div>

                        {/* Quick Select All Buttons */}
                        {payableLoans.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAllPay}
                                    className="rounded-xl border-amber-500/30 text-slate-800 hover:bg-amber-50 text-xs font-semibold h-8"
                                >
                                    <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                    {isAllPaying ? "Deselect All Pay" : "Select All Pay"}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white border-b border-amber-500/30 text-center">
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Status
                                    </th>

                                    {/* Select All Pay Header Checkbox */}
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                id="selectAllPay"
                                                checked={isAllPaying}
                                                onChange={toggleSelectAllPay}
                                                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                            />
                                            <label htmlFor="selectAllPay" className="cursor-pointer text-amber-400">
                                                PAY
                                            </label>
                                        </div>
                                    </th>

                                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-left">
                                        Name
                                    </th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Due No
                                    </th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Principal
                                    </th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Interest
                                    </th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Savings
                                    </th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        Amount
                                    </th>

                                    {/* Select All Present Header Checkbox */}
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                id="selectAllPresent"
                                                checked={isAllPresent}
                                                onChange={toggleSelectAllPresent}
                                                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                            />
                                            <label htmlFor="selectAllPresent" className="cursor-pointer text-amber-400">
                                                PRESENT
                                            </label>
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 text-center">
                                {loans.map((l, i) => {
                                    const isPayable = l.status === "UNPAID" || l.status === "PARTIAL";

                                    return (
                                        <tr
                                            key={l._id || i}
                                            className={`transition-colors ${l.isPaying ? "bg-amber-50/50" : "hover:bg-slate-50"
                                                }`}
                                        >
                                            {/* Status Badge */}
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${l.status === "UNPAID"
                                                        ? "bg-amber-100 text-amber-800 border border-amber-300/80"
                                                        : l.status === "PARTIAL"
                                                            ? "bg-purple-100 text-purple-800 border border-purple-300/80"
                                                            : l.status === "ARREAR"
                                                                ? "bg-rose-100 text-rose-800 border border-rose-300/80"
                                                                : l.status === "COMPLETED"
                                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                                                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                                        }`}
                                                >
                                                    {l.status}
                                                </span>
                                            </td>

                                            {/* Pay Checkbox */}
                                            <td className="py-3 px-3">
                                                {isPayable ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={l.isPaying}
                                                        onChange={() => togglePay(i)}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                    />
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Customer Name */}
                                            <td className="py-3 px-3 font-bold text-slate-900 text-left">
                                                {l.customer?.name || "-"}
                                            </td>

                                            {/* Next Due No */}
                                            <td className="py-3 px-3 font-semibold text-slate-700">
                                                {l.nextDueNo || "-"}
                                            </td>

                                            {/* Principal */}
                                            <td className="py-3 px-3 text-slate-600">
                                                ₹{l.principal}
                                            </td>

                                            {/* Interest */}
                                            <td className="py-3 px-3 text-slate-600">
                                                ₹{l.interest}
                                            </td>

                                            {/* Savings */}
                                            <td className="py-3 px-3 text-slate-600">
                                                ₹{l.savings}
                                            </td>

                                            {/* Due / Collected Amount */}
                                            <td className="py-3 px-3 font-bold text-slate-900">
                                                ₹{l.isPaying ? l.dueAmount : 0}
                                            </td>

                                            {/* Present Checkbox */}
                                            <td className="py-3 px-3">
                                                {isPayable ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={l.isPresent}
                                                        onChange={() => togglePresence(i)}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                    />
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Collection Summary & Submit Card */}
            {loans.length > 0 && (
                <Card className="p-5 max-w-md rounded-2xl border border-amber-500/20 bg-white/95 shadow-md space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Selected Members
                        </span>
                        <span className="font-bold text-slate-800">
                            {loans.filter((l) => l.isPaying).length} / {payableLoans.length}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-lg">
                        <span className="font-bold text-slate-700">Total Collected</span>
                        <span className="font-black text-2xl bg-linear-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                            ₹{totalCollected.toLocaleString("en-IN")}
                        </span>
                    </div>

                    <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-sm rounded-xl h-11 transition-all cursor-pointer disabled:opacity-50"
                        disabled={totalCollected === 0 || submitting}
                        onClick={submit}
                    >
                        {submitting ? "Submitting Collection..." : "Submit Collection"}
                    </Button>
                </Card>
            )}
        </div>
    );
}