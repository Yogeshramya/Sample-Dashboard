"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import { FileUpload } from "@/components/Clients/FileUpload";
import { UserCheck } from "lucide-react";

interface Branch {
    _id: string;
    name: string;
}

export default function EditEmployee() {
    const router = useRouter();
    const { id } = useParams();
    const { data: session } = useSession();

    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        role: "EMPLOYEE_MFI",
        branch: "",
        branches: [] as string[],
        password: "",
        confirmPassword: "",
        profileImage: "", // Added Profile Image state
    });

    /* LOAD DATA */
    useEffect(() => {
        if (!id) return;

        async function loadData() {
            try {
                const empRes = await fetch(`/api/employees/${id}`);
                const empData = await empRes.json();

                setForm((f) => ({
                    ...f,
                    name: empData?.name || "",
                    email: empData?.email || "",
                    role: empData?.role || "EMPLOYEE_MFI",
                    branch: empData?.branch?._id || "",
                    branches: empData?.branches?.map((b: Branch) => b?._id) || [],
                    profileImage: empData?.profileImage || "", // Load existing image
                }));

                const branchRes = await fetch("/api/branches/list");
                const branchData = await branchRes.json();

                setBranches(branchData.branches || []);
            } catch (err) {
                console.log(err);
                toast.error("Failed to load data");
            }
        }

        loadData();
    }, [id]);

    /* UPDATE USER */
    async function handleUpdate() {
        if (!session?.user?.role) {
            toast.error("Unauthorized");
            return;
        }

        if (form.role === "AREA_MANAGER" && form.branches.length === 0) {
            toast.error("Select at least one branch");
            return;
        }

        if (
            (form.role === "MANAGER" ||
                form.role === "EMPLOYEE_MFI" ||
                form.role === "TELLER") &&
            !form.branch
        ) {
            toast.error("Please select a branch");
            return;
        }

        if (form.password) {
            if (form.password !== form.confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/employees/update/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    role: form.role,
                    branch: form.branch || null,
                    branches: form.branches || [],
                    password: form.password || undefined,
                    profileImage: form.profileImage, // Send profile image to backend
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                toast.error(errorData.message || "Failed to update employee");
                return;
            }

            toast.success("Employee updated successfully");
            router.push("/dashboard/employees");

        } catch (err) {
            console.log(err);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader />

            <div className="flex items-center gap-3">
                <UserCheck className="w-7 h-7 text-amber-500" />
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-blue-950 bg-clip-text text-transparent">
                        Edit Employee
                    </h1>
                    <p className="text-sm text-slate-500">Update employee profile, access roles, and assignments</p>
                </div>
            </div>

            <Card className="rounded-2xl border border-amber-500/20 shadow-sm">
                <CardContent className="space-y-6 p-6 md:p-8">

                    {/* PROFILE IMAGE UPLOAD */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl max-w-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                            Profile Picture
                        </p>
                        <FileUpload
                            label="Upload Photo"
                            value={form.profileImage}
                            onChange={(val) => setForm({ ...form, profileImage: val })}
                            folder={`profileimage/${id}`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* NAME */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Full Name</p>
                            <Input
                                placeholder="Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="rounded-xl border-slate-300"
                            />
                        </div>

                        {/* EMAIL */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Email Address</p>
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="rounded-xl border-slate-300"
                            />
                        </div>

                        {/* ROLE */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">System Role</p>
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
                                <SelectTrigger className="rounded-xl border-slate-300">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACCOUNTS_HEAD">Accounts Head</SelectItem>
                                    <SelectItem value="AREA_MANAGER">Area Manager</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="TELLER">Teller</SelectItem>
                                    <SelectItem value="EMPLOYEE_MFI">Employee</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SINGLE BRANCH (ACCOUNTS_HEAD + MANAGER + EMPLOYEE + TELLER) */}
                        {(form.role === "ACCOUNTS_HEAD" || form.role === "MANAGER" || form.role === "EMPLOYEE_MFI" || form.role === "TELLER") && (
                            <div className="space-y-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    {form.role === "ACCOUNTS_HEAD" ? "Home Branch (Optional)" : "Assigned Branch"}
                                </p>
                                <Select
                                    value={form.branch}
                                    onValueChange={(v) => setForm({ ...form, branch: v })}
                                >
                                    <SelectTrigger className="rounded-xl border-slate-300">
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b._id} value={b._id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* AREA MANAGER MULTI BRANCH */}
                    {form.role === "AREA_MANAGER" && (
                        <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Assign Managed Branches
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {branches.map((b) => (
                                    <label key={b._id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                                            checked={form.branches.includes(b._id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setForm({
                                                        ...form,
                                                        branches: [...form.branches, b._id],
                                                    });
                                                } else {
                                                    setForm({
                                                        ...form,
                                                        branches: form.branches.filter((id) => id !== b._id),
                                                    });
                                                }
                                            }}
                                        />
                                        {b.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PASSWORD CHANGE */}
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-sm font-bold text-slate-800 mb-4">
                            Change Password <span className="text-slate-400 font-normal">(Optional)</span>
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                type="password"
                                placeholder="New Password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="rounded-xl border-slate-300"
                            />
                            <Input
                                type="password"
                                placeholder="Confirm New Password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                className="rounded-xl border-slate-300"
                            />
                        </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="flex justify-end pt-4">
                        <Button
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/20 shadow-sm rounded-xl px-8 h-11"
                            onClick={handleUpdate}
                            disabled={loading}
                        >
                            {loading ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
