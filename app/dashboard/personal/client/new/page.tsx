"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Save,
    UserPlus,
    ShieldCheck,
    UserCheck,
    FileText,
    ArrowRight,
    Sparkles,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import LoadingOverlay from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import { FileUpload } from "@/components/Clients/FileUpload";

export default function NewPersonalClientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const defaultForm = {
        clientId: "",
        fullName: "",
        mobile: "",
        address: "",
        occupation: "Self-Employed",
        monthlyIncome: "15000",

        // PAN & ID Proof Details
        panNumber: "",
        idProofType: "Aadhaar",
        idProofNumber: "",

        // Nominee / Beneficiary Details
        nomineeName: "",
        nomineeMobile: "",
        nomineeRelation: "Spouse",
        nomineeAddress: "",
        nomineeAadhaar: "",
        nomineeIdType: "Aadhaar",
    };

    const [form, setForm] = useState(defaultForm);
    const [sameAddress, setSameAddress] = useState(true);

    const [urls, setUrls] = useState({
        panPhotoUrl: "",
        idProofFrontUrl: "",
        idProofBackUrl: "",
        nomineePhotoUrl: "",
        nomineeIdFrontUrl: "",
        nomineeIdBackUrl: "",
    });

    /* ---------------- Auto-Fetch Next Customer Code ---------------- */
    useEffect(() => {
        let isMounted = true;
        async function fetchNextCode() {
            try {
                const res = await fetch("/api/personal/clients/next-code");
                const data = await res.json();
                if (isMounted && data.success) {
                    setForm((prev) => ({ ...prev, clientId: data.nextCode }));
                }
            } catch (err) {
                console.error("Failed to fetch next client code:", err);
            }
        }
        fetchNextCode();
        return () => {
            isMounted = false;
        };
    }, []);

    /* ---------------- Input Handlers ---------------- */
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const updated = { ...prev, [name]: value };
            if (name === "address" && sameAddress) {
                updated.nomineeAddress = value;
            }
            return updated;
        });
    };

    const handleClearDraft = () => {
        setForm((prev) => ({ ...defaultForm, clientId: prev.clientId }));
        setUrls({
            panPhotoUrl: "",
            idProofFrontUrl: "",
            idProofBackUrl: "",
            nomineePhotoUrl: "",
            nomineeIdFrontUrl: "",
            nomineeIdBackUrl: "",
        });
        toast.success("Form cleared");
    };

    /* ---------------- Form Submission ---------------- */
    const handleSubmit = async (e: React.FormEvent, openPlanDirectly = false) => {
        e.preventDefault();

        // Validations
        if (!form.fullName.trim()) {
            return toast.error("Please enter the customer's full name");
        }
        if (!/^\d{10}$/.test(form.mobile)) {
            return toast.error("Please provide a valid 10-digit customer mobile number");
        }
        if (!form.address.trim()) {
            return toast.error("Please enter customer address");
        }
        const trimmedPan = form.panNumber.trim().toUpperCase();
        if (trimmedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedPan)) {
            return toast.error("Please enter a valid PAN format (e.g. ABCDE1234F)");
        }
        if (!form.idProofNumber.trim()) {
            return toast.error("Please enter Primary ID (Aadhaar/Voter) number");
        }
        if (!form.nomineeName.trim()) {
            return toast.error("Please provide a nominee name for this savings account");
        }

        setLoading(true);

        const payload = {
            ...form,
            guarantorName: form.nomineeName,
            guarantorMobile: form.nomineeMobile || form.mobile,
            guarantorRelation: form.nomineeRelation,
            guarantorAddress: sameAddress ? form.address : form.nomineeAddress || form.address,
            guarantorAadhaar: form.nomineeAadhaar,
            guarantorIdType: form.nomineeIdType,
            ...urls,
            monthlyIncome: Number(form.monthlyIncome) || 10000,
            panNumber: trimmedPan || "NOTPROVIDED",
            status: "PENDING",
        };

        try {
            const res = await fetch("/api/personal/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            setLoading(false);

            if (result.exists) {
                toast.error(`${result.message}: ${result.conflictWith.name}`);
                return;
            }

            if (result.success) {
                toast.success("Customer Registered & Submitted for Admin Approval!");
                if (openPlanDirectly && result.client?._id) {
                    router.push(`/dashboard/personal/fund/new?customerId=${result.client._id}`);
                } else {
                    router.push("/dashboard/personal/client");
                }
                return;
            }

            toast.error(result.message || result.error || "Failed to create customer");
        } catch {
            setLoading(false);
            toast.error("Network error while submitting customer profile");
        }
    };

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <UserPlus className="w-8 h-8 text-amber-500" />
                        Register Smart Savings Customer
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Enroll a new subscriber into the Smart Savings Plan.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleClearDraft}
                    className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Form
                </button>
            </div>

            <form className="space-y-8">
                {/* 1. Primary Customer Profile */}
                <div className="bg-white rounded-3xl border border-amber-500/20 p-6 md:p-8 shadow-xs space-y-6">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <UserCheck className="w-5 h-5 text-amber-600" />
                        <h2 className="text-lg font-bold text-slate-900">Personal & Contact Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Customer ID</label>
                            <input
                                type="text"
                                disabled
                                value={form.clientId}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-100 font-bold font-mono text-slate-700 cursor-not-allowed outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Full Name *</label>
                            <input
                                type="text"
                                name="fullName"
                                required
                                value={form.fullName}
                                onChange={handleChange}
                                placeholder="e.g. Ramesh Kumar"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                required
                                maxLength={10}
                                value={form.mobile}
                                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })}
                                placeholder="10-digit number"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Occupation *</label>
                            <input
                                type="text"
                                name="occupation"
                                required
                                value={form.occupation}
                                onChange={handleChange}
                                placeholder="Salaried / Business / Homemaker"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Monthly Income (₹)</label>
                            <input
                                type="number"
                                name="monthlyIncome"
                                min={0}
                                value={form.monthlyIncome}
                                onChange={handleChange}
                                placeholder="e.g. 20000"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Residential Address *</label>
                            <textarea
                                rows={2}
                                name="address"
                                required
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Door No, Street, Village/Town, District, Pincode"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Customer KYC & Identification */}
                <div className="bg-white rounded-3xl border border-amber-500/20 p-6 md:p-8 shadow-xs space-y-6">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        <h2 className="text-lg font-bold text-slate-900">KYC & Identity Verification</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Primary ID Type *</label>
                            <select
                                name="idProofType"
                                value={form.idProofType}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm cursor-pointer"
                            >
                                <option value="Aadhaar">Aadhaar Card</option>
                                <option value="Voter ID">Voter ID</option>
                                <option value="Driving License">Driving License</option>
                                <option value="Passport">Passport</option>
                                <option value="Ration Card">Ration Card</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">ID Proof Number *</label>
                            <input
                                type="text"
                                name="idProofNumber"
                                required
                                value={form.idProofNumber}
                                onChange={handleChange}
                                placeholder="Enter document / Aadhaar number"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">PAN Number (Optional)</label>
                            <input
                                type="text"
                                name="panNumber"
                                maxLength={10}
                                value={form.panNumber}
                                onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                                placeholder="ABCDE1234F (Optional)"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white font-mono uppercase text-sm"
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Customer Document Attachments (Optional)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FileUpload
                                label="Customer Photo"
                                value={urls.panPhotoUrl}
                                onChange={(val) => setUrls((p) => ({ ...p, panPhotoUrl: val }))}
                                folder={`savings-clients/${form.clientId || "temp"}/photo`}
                            />
                            <FileUpload
                                label="Primary ID (Front)"
                                value={urls.idProofFrontUrl}
                                onChange={(val) => setUrls((p) => ({ ...p, idProofFrontUrl: val }))}
                                folder={`savings-clients/${form.clientId || "temp"}/id-front`}
                            />
                            <FileUpload
                                label="Primary ID (Back)"
                                value={urls.idProofBackUrl}
                                onChange={(val) => setUrls((p) => ({ ...p, idProofBackUrl: val }))}
                                folder={`savings-clients/${form.clientId || "temp"}/id-back`}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Nominee / Beneficiary Details */}
                <div className="bg-white rounded-3xl border border-amber-500/20 p-6 md:p-8 shadow-xs space-y-6">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Nominee & Beneficiary Information</h2>
                            <p className="text-xs text-slate-500">Designated person to receive savings maturity benefits</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nominee Full Name *</label>
                            <input
                                type="text"
                                name="nomineeName"
                                required
                                value={form.nomineeName}
                                onChange={handleChange}
                                placeholder="Nominee's full name"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Relationship *</label>
                            <select
                                name="nomineeRelation"
                                value={form.nomineeRelation}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm cursor-pointer"
                            >
                                <option value="Spouse">Spouse</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Other Relative">Other Relative</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nominee Mobile</label>
                            <input
                                type="tel"
                                name="nomineeMobile"
                                maxLength={10}
                                value={form.nomineeMobile}
                                onChange={(e) => setForm({ ...form, nomineeMobile: e.target.value.replace(/\D/g, "") })}
                                placeholder="Nominee or family mobile"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nominee Aadhaar / ID No</label>
                            <input
                                type="text"
                                name="nomineeAadhaar"
                                value={form.nomineeAadhaar}
                                onChange={handleChange}
                                placeholder="Nominee ID number"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                id="sameAddressCheck"
                                checked={sameAddress}
                                onChange={(e) => {
                                    setSameAddress(e.target.checked);
                                    if (e.target.checked) {
                                        setForm((prev) => ({ ...prev, nomineeAddress: prev.address }));
                                    }
                                }}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <label htmlFor="sameAddressCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                Nominee residential address is identical to customer address
                            </label>
                        </div>

                        {!sameAddress && (
                            <div className="space-y-1.5 md:col-span-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nominee Address</label>
                                <textarea
                                    rows={2}
                                    name="nomineeAddress"
                                    value={form.nomineeAddress}
                                    onChange={handleChange}
                                    placeholder="Enter full address of the nominee"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-slate-50 focus:bg-white text-sm resize-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Action Controls */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm w-full sm:w-auto"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, false)}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 w-full sm:w-auto cursor-pointer"
                    >
                        <Save className="w-4 h-4 text-slate-700" />
                        Save Customer Only
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-slate-900 text-amber-400 font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-2.5 text-sm disabled:opacity-60 w-full sm:w-auto cursor-pointer"
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Save & Open Savings Plan
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                </div>
            </form>
        </section>
    );
}