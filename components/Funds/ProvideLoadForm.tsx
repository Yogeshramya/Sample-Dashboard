"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Customer } from "@/types/customer";
import { Dues, Loan } from "@/types/fund";
import ClientDetails from "../Clients/ClientDetails";

export default function ProvideLoanForm({ customer }: { customer: Customer }) {
    const router = useRouter();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [existingLoan, setExistingLoan] = useState<Loan | null>(null);
    const [previousLoan, setPreviousLoan] = useState<Loan | null>(null);
    const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

    const [dues, setDues] = useState<Dues[]>([]);
    const [loading, setLoading] = useState(true);

    const formLocked = existingLoan !== null;

    const [form, setForm] = useState({
        mfLoanId: "",
        loanDate: new Date().toISOString().split("T")[0],
        firstDueDate: "",
        maturedDate: "",
        employee: "",
        scheme: "",
        loanType: "",
        loanPurpose: "",
        loanAmount: ""
    });

    // Load Employee + Schemes + Check Existing Loan
    useEffect(() => {
        async function loadInitial() {
            try {
                const empRes = await fetch("/api/employees/list");
                const schRes = await fetch("/api/scheme/list");
                const loanRes = await fetch(`/api/fund/customer?customerId=${customer._id}`);

                const empData = await empRes.json();
                const schData = await schRes.json();
                const loanData = await loanRes.json();

                setEmployees(empData.employees || []);
                setSchemes(schData || []);

                /* ---------------- SET EMPLOYEE FROM CLIENT GROUP ---------------- */
                let groupEmployeeId = "";

                // Case 1: group already populated in customer
                if (
                    customer.group &&
                    typeof customer.group === "object" &&
                    (customer.group as unknown as { employee?: string | { _id: string } }).employee
                ) {
                    groupEmployeeId = customer.group.employee &&
                        typeof customer.group.employee === "string"
                        ? customer.group.employee
                        : (customer.group.employee as unknown as { _id: string })?._id;
                }

                // Case 2: group is only an ID → fetch group
                if (!groupEmployeeId && typeof customer.group === "string") {
                    try {
                        const grpRes = await fetch(`/api/group/${customer.group}`);
                        const grpData = await grpRes.json();

                        if (grpData?.group?.employee) {
                            groupEmployeeId =
                                typeof grpData.group.employee === "string"
                                    ? grpData.group.employee
                                    : grpData.group.employee._id;
                        }
                    } catch (e) {
                        console.log(e);
                        console.warn("Failed to load group employee");
                    }
                }

                const allLoans: Loan[] = loanData?.loans || [];

                // Check if customer has an active blocking loan (PENDING, APPROVED, ARREAR)
                const activeBlockingLoan = allLoans.find((l: Loan) =>
                    ["PENDING", "APPROVED", "ARREAR"].includes(l.status)
                );

                // Check if customer completed a previous loan (REPAID, CLOSED)
                const completedLoan = allLoans.find((l: Loan) =>
                    ["REPAID", "CLOSED"].includes(l.status)
                );
                if (completedLoan) {
                    setPreviousLoan(completedLoan);
                }

                if (activeBlockingLoan) {
                    setExistingLoan(activeBlockingLoan);

                    if (activeBlockingLoan.status === "APPROVED") {
                        toast.warning("Loan already approved for this customer.");
                    } else if (activeBlockingLoan.status === "PENDING") {
                        toast.warning("Loan is pending approval.");
                    } else if (activeBlockingLoan.status === "ARREAR") {
                        toast.error("Customer has an active loan in arrears.");
                    }

                    const targetSchemeId =
                        typeof activeBlockingLoan.scheme === "object" && activeBlockingLoan.scheme !== null
                            ? activeBlockingLoan.scheme._id
                            : activeBlockingLoan.scheme;
                    const matchingScheme = (schData || []).find((s: Scheme) => s._id === targetSchemeId);
                    setSelectedScheme(matchingScheme || (activeBlockingLoan.scheme as unknown as Scheme));
                    setForm({
                        mfLoanId: activeBlockingLoan.mfLoanId,
                        loanDate: activeBlockingLoan.loanDate ? activeBlockingLoan.loanDate.split("T")[0] : "",
                        firstDueDate: activeBlockingLoan.firstDueDate ? activeBlockingLoan.firstDueDate.split("T")[0] : "",
                        maturedDate: activeBlockingLoan.maturedDate ? activeBlockingLoan.maturedDate.split("T")[0] : "",
                        employee: (activeBlockingLoan.employee as Employee)?._id || "",
                        scheme: activeBlockingLoan.scheme?._id || "",
                        loanType: activeBlockingLoan.loanType || "",
                        loanPurpose: activeBlockingLoan.loanPurpose || "",
                        loanAmount: String(activeBlockingLoan.loanAmount || "")
                    });
                    setDues(activeBlockingLoan.dues || []);
                } else {
                    // Customer has no active blocking loan -> Eligible for new loan!
                    setExistingLoan(null);

                    // Set default employee from group
                    if (groupEmployeeId) {
                        setForm((prev) => ({
                            ...prev,
                            employee: groupEmployeeId,
                        }));
                    }
                }
            } catch (err) {
                console.log(err);
            }
            setLoading(false);
        }
        loadInitial();
    }, [customer._id, customer.group]);

    // On scheme select
    function handleSchemeChange(id: string) {
        if (formLocked) return toast.info("Loan already exists.");

        const scheme = schemes.find((s: Scheme) => s._id === id);
        if (!scheme) return;

        setSelectedScheme(scheme);

        setForm((p) => ({
            ...p,
            scheme: scheme._id,
            loanType: scheme.loanType,
            loanAmount: scheme.totalAmount,
        }));

        // Auto generate MF Loan ID
        setForm((p) => ({ ...p, mfLoanId: `${scheme.schemeId}-${customer.customerCode}` }));

        // Create dues based on scheme rows
        setDues(
            Array.isArray(scheme.rows)
                ? scheme.rows.map((row: SchemeRow) => ({
                    principal: Number(row.principal) || 0,
                    interest: Number(row.interest) || 0,
                    savings: Number(row.savings) || 0, // Ensure savings is a number
                    total:
                        (Number(row.principal) || 0) +
                        (Number(row.interest) || 0) +
                        (Number(row.savings) || 0),
                    paid: false,
                    paidAt: null,
                    weekNo: row.weekNo
                })) as Dues[] // Cast to Dues[] to satisfy the type

                : []
        );
    }

    // Auto calculate matured date when firstDueDate or selectedScheme changes
    useEffect(() => {
        if (
            !form.firstDueDate ||
            !selectedScheme ||
            !selectedScheme.rows ||
            !Array.isArray(selectedScheme.rows)
        ) {
            return;
        }

        const start = new Date(form.firstDueDate);
        const matured = new Date(start);
        matured.setDate(start.getDate() + selectedScheme.rows.length * 7);

        const maturedDateStr = matured.toISOString().split("T")[0];
        // Only update if needed, and avoid cascading renders by using a microtask
        if (form.maturedDate !== maturedDateStr) {
            Promise.resolve().then(() => {
                setForm(prevForm => ({
                    ...prevForm,
                    maturedDate: maturedDateStr,
                }));
            });
        }
        // Only run when firstDueDate or selectedScheme changes
    }, [form.firstDueDate, selectedScheme, form.maturedDate]);

    async function handleSubmit() {
        if (!selectedScheme || !form.employee || !form.firstDueDate) {
            return toast.error("Please complete all loan fields.");
        }

        const groupId =
            customer.group && typeof customer.group === "object" && "_id" in customer.group
                ? (customer.group as { _id: string })._id
                : customer.group;

        const payload = {
            ...form,
            customer: customer._id,
            phone: customer.phone,
            group: groupId,
            dues,
            status: "PENDING",
            createdAt: new Date()
        };

        const res = await fetch("/api/fund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            toast.success("Loan request submitted. Awaiting approval.");
            router.push("/dashboard/fund");
        } else {
            const errData = await res.json().catch(() => null);
            toast.error(errData?.error || "Failed to provide loan.");
            console.log(errData);
        }
    }

    if (loading) return <p className="text-center p-6">Loading...</p>;

    return (
        <section className="space-y-10">
            <h1 className="text-3xl font-bold text-green-700">Provide Loan</h1>

            {existingLoan && (
                <div
                    className={`p-3 rounded-lg text-center font-bold border ${
                        existingLoan.status === "APPROVED"
                            ? "bg-green-100 border-green-300 text-green-800"
                            : existingLoan.status === "PENDING"
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "bg-rose-100 border-rose-300 text-rose-800"
                    }`}
                >
                    {existingLoan.status === "APPROVED"
                        ? `Loan Already Approved (MF Loan ID: ${existingLoan.mfLoanId})`
                        : existingLoan.status === "PENDING"
                        ? `Loan Pending Approval (MF Loan ID: ${existingLoan.mfLoanId})`
                        : `Active Loan In Arrears (MF Loan ID: ${existingLoan.mfLoanId})`}
                </div>
            )}

            {!existingLoan && previousLoan && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <span className="font-bold text-sm">Previous Loan Completed: </span>
                            <span className="text-sm">
                                Loan <span className="font-mono font-semibold">{previousLoan.mfLoanId}</span> is marked as <strong>{previousLoan.status}</strong>. Customer is eligible for next scheme loan.
                            </span>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-200 text-emerald-800 uppercase tracking-wider">
                        Eligible
                    </span>
                </div>
            )}

            {/* Customer Section */}
            <ClientDetails client={customer} />

            {/* Loan Form */}
            <div className="border p-5 rounded-md space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {/*<FormInput label="MF Loan ID" value={form.mfLoanId} readOnly />*/}

                    <FormDate
                        label="Loan Date"
                        /*disabled*/
                        value={form.loanDate}
                        onChange={(v: string) => setForm({ ...form, loanDate: v })}
                    />

                    <FormSelect
                        label="Employee"
                        disabled={formLocked}
                        items={employees}
                        value={form.employee}
                        onChange={(v: string) => setForm({ ...form, employee: v })}
                    />

                    <FormSelect
                        label="Scheme"
                        disabled={formLocked}
                        items={schemes}
                        value={form.scheme}
                        onChange={handleSchemeChange}
                    />

                    <FormDate
                        label="First Due Date"
                        disabled={formLocked}
                        value={form.firstDueDate}
                        onChange={(v: string) => setForm({ ...form, firstDueDate: v })}
                    />

                    <FormInput label="Matured Date" value={form.maturedDate} readOnly />
                    <FormInput label="Loan Type" value={form.loanType} readOnly />

                    <div>
                        <Label>Loan Purpose</Label>
                        <Input
                            disabled={formLocked}
                            value={form.loanPurpose}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, loanPurpose: e.target.value })}
                        />
                    </div>

                    <FormInput
                        label="Loan Amount"
                        //type="number"
                        disabled
                        value={form.loanAmount}
                    />
                </div>

                {dues?.length > 0 && (
                    <>
                        <h3 className="font-semibold mt-4 text-lg">Repayment Schedule</h3>

                        <table className="w-full border mt-3">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="border p-2">Week</th>
                                    <th className="border p-2">Due Date</th>
                                    <th className="border p-2">Principal</th>
                                    <th className="border p-2">Interest</th>
                                    <th className="border p-2">Savings</th>
                                    <th className="border p-2">Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {dues.map((row: Dues, i: number) => {
                                    let dueDate = "";

                                    if (form.firstDueDate) {
                                        const startDate = new Date(form.firstDueDate);
                                        const due = new Date(startDate);
                                        due.setDate(startDate.getDate() + i * 7);
                                        dueDate = due.toISOString().split("T")[0];
                                    }

                                    return (
                                        <tr key={i} className="text-center">
                                            <td className="border p-2">{i + 1}</td>
                                            <td className="border p-2 font-semibold text-blue-700">
                                                {dueDate}
                                            </td>
                                            <td className="border p-2">{row.principal}</td>
                                            <td className="border p-2">{row.interest}</td>
                                            <td className="border p-2">{row.savings}</td>
                                            <td className="border p-2 font-bold">
                                                {row?.total?.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}

                {!formLocked && (
                    <Button
                        className="bg-green-700 hover:bg-green-800 px-10 py-4 text-lg"
                        onClick={handleSubmit}
                    >
                        Submit Loan Request
                    </Button>
                )}
            </div>
        </section>
    );
}

/* Reusable components */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

function FormInput({ label, ...props }: FormInputProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Input className="bg-gray-100" {...props} />
        </div>
    );
}

interface FormDateProps {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
}

function FormDate({ label, value, onChange, disabled }: FormDateProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Input
                type="date"
                disabled={disabled}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </div>
    );
}

interface FormSelectProps {
    label: string;
    items: { _id: string; name?: string; schemeName?: string; schemeId?: string }[];
    disabled?: boolean;
    onChange: (value: string) => void;
    value: string;
}

function FormSelect({ label, items, disabled, onChange, value }: FormSelectProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Select disabled={disabled} value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={`Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                            {item.name || `${item.schemeName} (${item.schemeId})`}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
