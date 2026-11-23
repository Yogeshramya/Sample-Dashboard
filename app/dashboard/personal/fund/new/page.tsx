"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PiggyBank, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalClient, PersonalScheme, PersonalEmployee } from "@/types/personal";
import { formatSchemeBenefitLabel } from "@/lib/personalSchemeCalc";

function NewSavingsAccountForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefillCustomerId = searchParams.get("customerId");
    const prefillSchemeId = searchParams.get("schemeId");

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<PersonalClient[]>([]);
    const [schemes, setSchemes] = useState<PersonalScheme[]>([]);
    const [employees, setEmployees] = useState<PersonalEmployee[]>([]);

    const [form, setForm] = useState({
        accountNumber: "",
        customer: prefillCustomerId || "",
        scheme: "",
        collectorId: "",
        startDate: new Date().toISOString().split("T")[0],
        nomineeName: "",
        nomineeRelation: "Spouse",
        nomineePhone: "",
        remarks: "",
    });

    const [selectedScheme, setSelectedScheme] = useState<PersonalScheme | null>(null);

    useEffect(() => {
        async function loadMeta() {
            try {
                const [cRes, sRes, eRes, codeRes] = await Promise.all([
                    fetch("/api/personal/clients").then((r) => r.json()),
                    fetch("/api/personal/schemes").then((r) => r.json()),
                    fetch("/api/employees/list").then((r) => r.json()),
                    fetch("/api/personal/accounts/next-code").then((r) => r.json()),
                ]);

                if (cRes.success) setClients(cRes.clients || []);
                if (sRes.success) {
                    setSchemes(sRes.schemes || []);
                    if (sRes.schemes?.length > 0) {
                        const initial = (prefillSchemeId ? sRes.schemes.find((s: PersonalScheme) => s._id === prefillSchemeId) : null) || sRes.schemes[0];
                        setSelectedScheme(initial);
                        setForm((prev) => ({ ...prev, scheme: initial._id }));
                    }
                }
                if (eRes.employees) setEmployees(eRes.employees || []);
                if (codeRes.success) setForm((prev) => ({ ...prev, accountNumber: codeRes.nextCode }));
            } catch (err) {
                console.error("Error loading account creation data:", err);
            }
        }
        loadMeta();
    }, []);

    // Autofill nominee from customer when selected
    const handleCustomerChange = (customerId: string) => {
        setForm((prev) => ({ ...prev, customer: customerId }));
        const found = clients.find((c) => c._id === customerId);
        if (found) {
            setForm((prev) => ({
                ...prev,
                customer: customerId,
                nomineeName: found.guarantorName || prev.nomineeName,
                nomineeRelation: found.guarantorRelation || prev.nomineeRelation,
                nomineePhone: found.guarantorMobile || prev.nomineePhone,
            }));
        }
    };

    const handleSchemeChange = (schemeId: string) => {
        setForm((prev) => ({ ...prev, scheme: schemeId }));
        const found = schemes.find((s) => s._id === schemeId);
        setSelectedScheme(found || null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer) return toast.error("Please select a customer");
        if (!form.scheme) return toast.error("Please select a savings scheme");

        setLoading(true);
        try {
            const res = await fetch("/api/personal/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Savings Plan Enrolled & Submitted for Admin Approval!");
                router.push("/dashboard/personal/fund/approval");
            } else {
                toast.error(data.message || "Failed to create account");
            }
        } catch {
            toast.error("Network error while creating account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <PiggyBank className="w-8 h-8 text-amber-500" />
                        Open Smart Savings Account
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Enroll a customer into a 12-month savings plan with 2 months guaranteed company benefit.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Primary Form Inputs */}
                    <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Account Number</label>
                                <Input
                                    value={form.accountNumber}
                                    disabled
                                    className="bg-slate-100 font-bold font-mono text-slate-700"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Start Date *</label>
                                <Input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                    required
                                    className="rounded-xl font-medium"
                                />
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Select Customer *</label>
                                <select
                                    value={form.customer}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    required
                                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="">-- Choose Customer --</option>
                                    {clients.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.fullName} ({c.clientId}) - {c.mobile}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Select Savings Scheme *</label>
                                <select
                                    value={form.scheme}
                                    onChange={(e) => handleSchemeChange(e.target.value)}
                                    required
                                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                >
                                    {schemes.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.schemeName} ({s.frequency}) - ₹{s.installmentAmount.toLocaleString()}/cycle
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Assigned Collector / Officer</label>
                                <select
                                    value={form.collectorId}
                                    onChange={(e) => setForm({ ...form, collectorId: e.target.value })}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="">-- Auto-assign to current logged in staff --</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.name} ({emp.phone || emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nominee Details */}
                            <div className="col-span-2 pt-3 border-t space-y-3">
                                <h3 className="font-bold text-sm text-slate-800">Nominee / Beneficiary Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="font-bold text-slate-500 text-[11px] uppercase">Nominee Name</label>
                                        <Input
                                            value={form.nomineeName}
                                            onChange={(e) => setForm({ ...form, nomineeName: e.target.value })}
                                            placeholder="Nominee Full Name"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-bold text-slate-500 text-[11px] uppercase">Relationship</label>
                                        <Input
                                            value={form.nomineeRelation}
                                            onChange={(e) => setForm({ ...form, nomineeRelation: e.target.value })}
                                            placeholder="e.g. Spouse / Father"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-bold text-slate-500 text-[11px] uppercase">Nominee Phone</label>
                                        <Input
                                            value={form.nomineePhone}
                                            onChange={(e) => setForm({ ...form, nomineePhone: e.target.value })}
                                            placeholder="Contact Number"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scheme Summary / Live Preview Card */}
                    <div className="bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white space-y-5 h-fit shadow-xl border border-amber-500/30">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-700/80">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <h3 className="font-bold text-base text-amber-300">Plan Payout Preview</h3>
                        </div>

                        {selectedScheme ? (
                            <div className="space-y-3.5 text-xs">
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Scheme Selected</p>
                                    <p className="text-lg font-black text-white mt-0.5">{selectedScheme.schemeName}</p>
                                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/40">
                                        {selectedScheme.frequency} Frequency
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-800 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Installment Amount:</span>
                                        <span className="font-bold text-white text-sm">
                                            ₹ {selectedScheme.installmentAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Tenure:</span>
                                        <span className="font-bold text-white">{selectedScheme.durationMonths || 12} Months</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Total Installments:</span>
                                        <span className="font-bold text-white">{selectedScheme.totalInstallments}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">{selectedScheme.durationMonths || 12}-Mo Deposit Total:</span>
                                        <span className="font-bold text-white">
                                            ₹ {selectedScheme.totalContribution.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-400">
                                        <span>Company Bonus ({formatSchemeBenefitLabel(selectedScheme)}):</span>
                                        <span className="font-black">+ ₹ {selectedScheme.benefitAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Guaranteed Maturity Payout</p>
                                    <p className="text-2xl font-black text-amber-300 mt-0.5">
                                        ₹ {selectedScheme.maturityAmount.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-slate-300 mt-1">
                                        Full Deposit + {formatSchemeBenefitLabel(selectedScheme)} Company Benefit Bonus
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-6">Select a scheme to view details</p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black rounded-xl py-6 cursor-pointer text-sm"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Confirm & Open Account
                        </Button>
                    </div>
                </div>
            </form>
        </section>
    );
}

export default function NewSavingsAccountPage() {
    return (
        <Suspense fallback={<LoadingOverlay show={true} />}>
            <NewSavingsAccountForm />
        </Suspense>
    );
}

