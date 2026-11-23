"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "../PageHeader";
import LoadingOverlay from "../Loading";
import Image from "next/image";
import { Group } from "@/types/group";
import { FileUpload } from "./FileUpload";

interface Nominee {
    name: string;
    dob: string;
    age: string;
    gender: string;
    aadhar: string;
    phone: string;
    relation: string;
    occupation: string;
}

interface FormState {
    employee: string;
    group: string;
    joiningDate: string;
    customerCode: string;

    name: string;
    dob: string;
    age: string;
    gender: string;
    doorStreet: string;
    area: string;
    city: string;
    district: string;
    state: string;
    postalCode: string;
    aadhar: string;
    phone: string;
    voterId: string;
    rationCard: string;
    religion: string;
    houseType: string;
    panNo: string;
    occupation: string;
    savingsDue: string;
    loanType: string;
    loanAmount: string;
    documentFile: string;

    nominee: Nominee;
}

/* --------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------- */

export default function EditClientPage({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const [form, setForm] = useState<FormState>({
        employee: "",
        group: "",
        joiningDate: "",
        customerCode: "",
        name: "",
        dob: "",
        age: "",
        gender: "",
        doorStreet: "",
        area: "",
        city: "",
        district: "",
        state: "",
        postalCode: "",
        aadhar: "",
        phone: "",
        voterId: "",
        rationCard: "",
        religion: "",
        houseType: "",
        panNo: "",
        occupation: "",
        savingsDue: "",
        loanType: "",
        loanAmount: "",
        documentFile: "",
        nominee: {
            name: "",
            dob: "",
            age: "",
            gender: "",
            aadhar: "",
            phone: "",
            relation: "",
            occupation: ""
        }
    });

    const [urls, setUrls] = useState({
        memberPhoto: "",
        memberAadhaarFront: "",
        memberAadhaarBack: "",
        nomineePhoto: "",
        nomineeAadhaarFront: "",
        nomineeAadhaarBack: "",
        documentFile: ""
    });

    /* --------------------------------------------------
       LOAD CLIENT DATA
    -------------------------------------------------- */
    useEffect(() => {
        async function loadClient() {
            const res = await fetch(`/api/clients/${id}`);
            const json = await res.json();
            if (!json.success) return toast.error("Customer not found");

            const c = json.client;

            setForm({
                ...c,
                employee: c.employee?._id.toString() ?? "",
                group: c.group?._id.toString() ?? "",
                nominee: {
                    name: c.nominee?.name ?? "",
                    dob: c.nominee?.dob ?? "",
                    age: c.nominee?.age ?? "",
                    gender: c.nominee?.gender ?? "",
                    aadhar: c.nominee?.aadhar ?? "",
                    phone: c.nominee?.phone ?? "",
                    relation: c.nominee?.relation ?? "",
                    occupation: c.nominee?.occupation ?? ""
                }
            });

            setUrls({
                memberPhoto: c.memberPhoto || "",
                memberAadhaarFront: c.memberAadhaarFront || "",
                memberAadhaarBack: c.memberAadhaarBack || "",
                nomineePhoto: c.nominee?.photo || "",
                nomineeAadhaarFront: c.nominee?.aadhaarFront || "",
                nomineeAadhaarBack: c.nominee?.aadhaarBack || "",
                documentFile: c.documentFile || ""
            });

            setLoading(false);
        }
        loadClient();
    }, [id]);

    /* --------------------------------------------------
       LOAD EMPLOYEES
    -------------------------------------------------- */
    useEffect(() => {
        fetch("/api/employees/list")
            .then(res => res.json())
            .then(data => setEmployees(data.employees ?? []));
    }, []);

    /* --------------------------------------------------
       LOAD GROUPS WHEN EMPLOYEE CHANGES
    -------------------------------------------------- */
    useEffect(() => {
        if (!form.employee) return;

        fetch(`/api/group/list?employee=${form.employee}&status=ACTIVE`)
            .then(res => res.json())
            .then(data => setGroups(data.groups ?? []));
    }, [form.employee]);

    /* --------------------------------------------------
       HANDLERS
    -------------------------------------------------- */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleNomineeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({
            ...prev,
            nominee: { ...prev.nominee, [e.target.name]: e.target.value }
        }));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const finalPayload = {
            ...form,
            ...urls,

            nominee: {
                name: form.nominee.name,
                dob: form.nominee.dob,
                age: form.nominee.age,
                gender: form.nominee.gender,
                aadhar: form.nominee.aadhar,
                phone: form.nominee.phone,
                relation: form.nominee.relation,
                occupation: form.nominee.occupation,
                photo: urls.nomineePhoto,
                aadhaarFront: urls.nomineeAadhaarFront,
                aadhaarBack: urls.nomineeAadhaarBack,
            },
        };

        const res = await fetch(`/api/clients/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalPayload),
        });

        const out = await res.json();
        setLoading(false);

        if (!out.success) return toast.error(out.error || "Failed to update customer");

        toast.success("Customer Updated Successfully!");
        router.push(`/dashboard/client/${id}`);
    };

    /* --------------------------------------------------
       UI
    -------------------------------------------------- */

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />
            <h1 className="text-2xl font-bold">Edit Customer</h1>

            <Card>
                <CardContent className="p-6 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* BASIC DETAILS */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField label="Employee" name="employee" values={employees} form={form} setForm={setForm} />
                            <SelectField label="Group" name="group" values={groups} form={form} setForm={setForm} />

                            <InputField label="Joining Date" name="joiningDate" value={form.joiningDate} type="date" onChange={handleChange} />

                            <InputField label="Customer Code" name="customerCode" value={form.customerCode} onChange={handleChange} required disabled />

                            <InputField label="Full Name" name="name" value={form.name} onChange={handleChange} required />

                            <InputField label="DOB" name="dob" type="date" value={form.dob} onChange={handleChange} />
                            <InputField label="Age" name="age" value={form.age} onChange={handleChange} />

                            <RadioGroupField label="Gender" name="gender" current={form.gender} onChange={handleChange} />

                            <InputField label="Door/Street" name="doorStreet" value={form.doorStreet} onChange={handleChange} />
                            <InputField label="Area" name="area" value={form.area} onChange={handleChange} />
                            <InputField label="City" name="city" value={form.city} onChange={handleChange} />
                            <InputField label="District" name="district" value={form.district} onChange={handleChange} />
                            <InputField label="State" name="state" value={form.state} onChange={handleChange} />
                            <InputField label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
                            <InputField label="Aadhar No" name="aadhar" value={form.aadhar} onChange={handleChange} />
                            <InputField label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
                            <InputField
                                label="Occupation"
                                name="occupation"
                                value={form.occupation}
                                onChange={handleChange}
                            />

                            <FileUpload
                                label="Member Photo *"
                                value={urls.memberPhoto}
                                onChange={(val) => setUrls(p => ({ ...p, memberPhoto: val }))}
                                folder={`clients/${form.customerCode}/member`}
                            />
                            <FileUpload
                                label="Aadhaar Front"
                                value={urls.memberAadhaarFront}
                                onChange={(val) => setUrls(p => ({ ...p, memberAadhaarFront: val }))}
                                folder={`clients/${form.customerCode}/member`}
                            />
                            <FileUpload
                                label="Aadhaar Back"
                                value={urls.memberAadhaarBack}
                                onChange={(val) => setUrls(p => ({ ...p, memberAadhaarBack: val }))}
                                folder={`clients/${form.customerCode}/member`}
                            />
                        </section>

                        {/* DOCUMENT */}
                        <section>
                            <h2 className="text-xl font-semibold mb-3">Document</h2>

                            {form.documentFile && (
                                <div className="mb-2">
                                    <p className="text-sm text-gray-600">Current Document:</p>
                                    <Image
                                        src={form.documentFile}
                                        alt="Document"
                                        className="w-32 h-32 object-cover rounded border"
                                        loading="eager"
                                        width={128}
                                        height={128}
                                    />
                                </div>
                            )}

                            <FileUpload
                                label="General Document (KYC / Agreement)"
                                value={urls.documentFile}
                                onChange={(val) => setUrls(p => ({ ...p, documentFile: val }))}
                                folder={`clients/${form.customerCode}/documents`}
                            />
                        </section>

                        {/* NOMINEE */}
                        <section>
                            <h2 className="text-xl font-semibold mb-3">Nominee Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Nominee Name" name="name" value={form.nominee.name} onChange={handleNomineeChange} />
                                <InputField label="Nominee DOB" name="dob" type="date" value={form.nominee.dob} onChange={handleNomineeChange} />
                                <InputField label="Nominee Age" name="age" value={form.nominee.age} onChange={handleNomineeChange} />

                                <RadioGroupField label="Nominee Gender" name="gender" current={form.nominee.gender} onChange={handleNomineeChange} />

                                <InputField label="Nominee Aadhaar" name="aadhar" value={form.nominee.aadhar} onChange={handleNomineeChange} />
                                <InputField label="Nominee Phone" name="phone" value={form.nominee.phone} onChange={handleNomineeChange} />
                                <InputField label="Relation" name="relation" value={form.nominee.relation} onChange={handleNomineeChange} />
                                <InputField
                                    label="Nominee Occupation"
                                    name="occupation"
                                    value={form.nominee.occupation}
                                    onChange={handleNomineeChange}
                                />

                                <FileUpload
                                    label="Nominee Photo *"
                                    value={urls.nomineePhoto}
                                    onChange={(val) => setUrls(p => ({ ...p, nomineePhoto: val }))}
                                    folder={`clients/${form.customerCode}/nominee`}
                                />
                                <FileUpload
                                    label="Nominee Aadhaar Front"
                                    value={urls.nomineeAadhaarFront}
                                    onChange={(val) => setUrls(p => ({ ...p, nomineeAadhaarFront: val }))}
                                    folder={`clients/${form.customerCode}/nominee`}
                                />
                                <FileUpload
                                    label="Nominee Aadhaar Back"
                                    value={urls.nomineeAadhaarBack}
                                    onChange={(val) => setUrls(p => ({ ...p, nomineeAadhaarBack: val }))}
                                    folder={`clients/${form.customerCode}/nominee`}
                                />
                            </div>
                        </section>

                        <div className="flex justify-end">
                            <Button type="submit" className="px-8">Update Client</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

/* --------------------------------------------------
   REUSABLE COMPONENTS — FULLY TYPED
-------------------------------------------------- */

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: string;
}

function InputField({ label, ...props }: InputFieldProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Input className="mt-1" {...props} />
        </div>
    );
}

interface RadioFieldProps {
    label: string;
    name: string;
    current: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function RadioGroupField({ label, name, current, onChange }: RadioFieldProps) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex gap-4 mt-2">
                {["Male", "Female"].map((g) => (
                    <label key={g}>
                        <input
                            type="radio"
                            name={name}
                            value={g}
                            checked={current === g}
                            onChange={onChange}
                        />{" "}
                        {g}
                    </label>
                ))}
            </div>
        </div>
    );
}

interface SelectFieldProps<T> {
    label: string;
    name: string;
    values: T[];
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

function SelectField<T extends { _id: string; name?: string; groupName?: string }>({
    label,
    name,
    values,
    form,
    setForm
}: SelectFieldProps<T>) {
    return (
        <div>
            <Label>{label}</Label>
            <select
                name={name}
                className="border p-2 rounded w-full"
                value={form[name as keyof FormState] as string}
                onChange={(e) => setForm(prev => ({ ...prev, [name]: e.target.value }))}
            >
                <option value="">Select {label}</option>
                {values.map((item) => (
                    <option key={item._id} value={item._id}>
                        {item.name || item.groupName}
                    </option>
                ))}
            </select>
        </div>
    );
}
