"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Coins, Search, Users as UsersIcon } from "lucide-react";

export default function Employees() {
    const router = useRouter();
    const { data: session } = useSession();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [roleFilter, setRoleFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE_MFI",
        branch: "",
        branches: [] as string[],
    });

    const currentUserRole = session?.user?.role ?? "";
    const activeBranchName =
        session?.user?.activeBranch?.name ||
        session?.user?.branch?.name ||
        "Active Branch";

    /* LOAD DATA */

    useEffect(() => {
        (async () => {
            const empRes = await fetch("/api/employees/list").then((r) =>
                r.json()
            );

            setEmployees(empRes.employees || []);

            const branchRes = await fetch("/api/branches/list").then((r) =>
                r.json()
            );

            setBranches(branchRes.branches || []);
        })();
    }, []);

    /* CREATE USER */

    async function handleCreate() {
        if (!form.name || !form.email || !form.password) {
            toast.error("All fields required");
            return;
        }

        if (form.role === "AREA_MANAGER" && form.branches.length === 0) {
            toast.error("Select at least one branch");
            return;
        }

        if (
            (form.role === "ACCOUNTS_HEAD" ||
                form.role === "MANAGER" ||
                form.role === "EMPLOYEE_MFI" ||
                form.role === "TELLER") &&
            !form.branch
        ) {
            toast.error("Please select branch");
            return;
        }

        const res = await fetch("/api/employees/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                branch: form.branch || null,
                branches: form.branches || [],
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Creation failed");
            return;
        }

        toast.success("User created successfully");

        const updated = await fetch("/api/employees/list").then((r) =>
            r.json()
        );

        setEmployees(updated.employees || []);

        setForm({
            name: "",
            email: "",
            password: "",
            role: "EMPLOYEE_MFI",
            branch: "",
            branches: [],
        });
    }

    /* DELETE USER */

    async function handleDelete(id: string) {
        if (!confirm("Delete user?")) return;

        const res = await fetch(`/api/employees/delete/${id}`, {
            method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data.message || "Delete failed");
            return;
        }

        setEmployees((prev) => prev.filter((e) => e._id !== id));
        toast.success("Deleted");
    }

    /* ROLE OPTIONS */

    const roleOptions =
        currentUserRole === "ADMINISTRATOR" || currentUserRole === "ACCOUNTS_HEAD"
            ? ["ACCOUNTS_HEAD", "AREA_MANAGER", "MANAGER", "EMPLOYEE_MFI", "TELLER"]
            : currentUserRole === "AREA_MANAGER"
                ? ["MANAGER", "EMPLOYEE_MFI", "TELLER"]
                : currentUserRole === "MANAGER"
                    ? ["EMPLOYEE_MFI", "TELLER"]
                    : [];

    const getRoleLabel = (r: string) => {
        switch (r) {
            case "ADMINISTRATOR":
                return "Administrator";
            case "ACCOUNTS_HEAD":
                return "Accounts Head";
            case "AREA_MANAGER":
                return "Area Manager";
            case "MANAGER":
                return "Branch Manager";
            case "TELLER":
                return "Branch Teller";
            case "EMPLOYEE_MFI":
                return "Employee (MFI)";
            default:
                return r;
        }
    };

    const getRoleBadge = (r: string) => {
        switch (r) {
            case "ADMINISTRATOR":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Administrator
                    </span>
                );
            case "ACCOUNTS_HEAD":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Accounts Head
                    </span>
                );
            case "AREA_MANAGER":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Area Manager
                    </span>
                );
            case "MANAGER":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Branch Manager
                    </span>
                );
            case "TELLER":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                        Branch Teller
                    </span>
                );
            case "EMPLOYEE_MFI":
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Employee (MFI)
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {r}
                    </span>
                );
        }
    };

    const filteredEmployees = employees.filter((emp) => {
        // Exclude administrators from staff page
        if (emp.role === "ADMINISTRATOR") {
            return false;
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = emp.name?.toLowerCase().includes(q);
            const emailMatch = emp.email?.toLowerCase().includes(q);
            if (!nameMatch && !emailMatch) return false;
        }

        if (roleFilter !== "ALL" && emp.role !== roleFilter) {
            return false;
        }

        return true;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        Manage Employees
                    </h1>
                    <p className="text-sm text-gray-500">
                        View employee profiles, configure roles, and manage staff accounts
                    </p>
                </div>
                {currentUserRole === "ADMINISTRATOR" && (
                    <Button
                        onClick={() => router.push("/dashboard/staff-salary")}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 font-bold gap-2 shadow-sm"
                    >
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>Salary & Payroll (Admin)</span>
                    </Button>
                )}
            </div>

            {(currentUserRole === "ADMINISTRATOR" ||
                currentUserRole === "ACCOUNTS_HEAD" ||
                currentUserRole === "AREA_MANAGER" ||
                currentUserRole === "MANAGER") && (
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <Input
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />

                        <Input
                            placeholder="Username"
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                        />

                        <Input
                            placeholder="Password"
                            type="password"
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />

                        {/* ROLE SELECT */}

                        <Select
                            value={form.role}
                            onValueChange={(v) =>
                                setForm({
                                    ...form,
                                    role: v,
                                    branch: "",
                                    branches: [],
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>

                            <SelectContent>
                                {roleOptions.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {getRoleLabel(role)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* AREA MANAGER MULTI BRANCH */}

                        {form.role === "AREA_MANAGER" && (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500">
                                    Assign Branches
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    {branches.map((b) => {
                                        const checked = form.branches.includes(b._id);

                                        return (
                                            <label
                                                key={b._id}
                                                className="flex items-center space-x-2 text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setForm({
                                                                ...form,
                                                                branches: [
                                                                    ...form.branches,
                                                                    b._id,
                                                                ],
                                                            });
                                                        } else {
                                                            setForm({
                                                                ...form,
                                                                branches:
                                                                    form.branches.filter(
                                                                        (id) =>
                                                                            id !==
                                                                            b._id
                                                                    ),
                                                            });
                                                        }
                                                    }}
                                                />
                                                <span>{b.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SINGLE BRANCH (ACCOUNTS_HEAD / MANAGER / EMPLOYEE / TELLER) */}

                        {(form.role === "ACCOUNTS_HEAD" ||
                            form.role === "MANAGER" ||
                            form.role === "EMPLOYEE_MFI" ||
                            form.role === "TELLER") && (
                            <Select
                                value={form.branch}
                                onValueChange={(v) =>
                                    setForm({ ...form, branch: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={form.role === "ACCOUNTS_HEAD" ? "Select Home Branch (Optional)" : "Select Branch"} />
                                </SelectTrigger>

                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b._id} value={b._id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button onClick={handleCreate}>
                            Create User
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* EMPLOYEE LIST */}

            <div className="space-y-4 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <UsersIcon className="w-6 h-6 text-amber-600" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-900">
                                    Staff Members
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {activeBranchName}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Showing {filteredEmployees.length} staff member(s) assigned to {activeBranchName}
                            </p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <div className="relative min-w-[200px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl bg-white"
                            />
                        </div>

                        {/* Role Filter */}
                        <Select
                            value={roleFilter}
                            onValueChange={setRoleFilter}
                        >
                            <SelectTrigger className="w-[160px] h-9 text-xs bg-white rounded-xl">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Roles</SelectItem>
                                <SelectItem value="ACCOUNTS_HEAD">Accounts Head</SelectItem>
                                <SelectItem value="AREA_MANAGER">Area Manager</SelectItem>
                                <SelectItem value="MANAGER">Branch Manager</SelectItem>
                                <SelectItem value="TELLER">Branch Teller</SelectItem>
                                <SelectItem value="EMPLOYEE_MFI">Employee (MFI)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                        <p className="text-sm font-semibold text-slate-500">No employees match the selected criteria.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {filteredEmployees.map((emp) => (
                            <Card key={emp._id} className="border border-slate-200/80 hover:shadow-md transition-shadow rounded-2xl">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <h3 className="font-bold text-base text-slate-900">
                                                {emp.name}
                                            </h3>
                                            <p className="text-xs font-mono text-slate-500">{emp.email}</p>
                                        </div>
                                        {getRoleBadge(emp.role)}
                                    </div>

                                    <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        {emp.branch && (
                                            <p>
                                                <span className="font-semibold text-slate-500">Branch:</span>{" "}
                                                <span className="font-bold text-slate-800">{emp.branch.name}</span>
                                            </p>
                                        )}

                                        {emp.branches && emp.branches.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-slate-500">Assigned Branches:</span>{" "}
                                                <span className="font-bold text-slate-800">
                                                    {emp.branches.map((b: { name: string }) => b?.name).join(", ")}
                                                </span>
                                            </p>
                                        )}

                                        {!emp.branch && (!emp.branches || emp.branches.length === 0) && (
                                            <p className="text-slate-500 italic">
                                                All Branches / Head Office Scope
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold text-xs h-8"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/profile?id=${emp._id}`
                                                )
                                            }
                                        >
                                            Profile
                                        </Button>

                                        {currentUserRole === "ADMINISTRATOR" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs h-8"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/staff-salary/calculator?employeeId=${emp._id}`
                                                    )
                                                }
                                            >
                                                Salary
                                            </Button>
                                        )}

                                        {emp._id !== session?.user?.id &&
                                            !(currentUserRole === "ACCOUNTS_HEAD" && emp.role === "ADMINISTRATOR") && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="text-xs h-8"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/employees/edit/${emp._id}`
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="text-xs h-8"
                                                    onClick={() =>
                                                        handleDelete(emp._id)
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
