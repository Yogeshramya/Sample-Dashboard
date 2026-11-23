"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Search, CalendarClock, Sliders } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonalScheme, SchemeType } from "@/types/personal";
import { calculatePersonalSchemeValues } from "@/lib/personalSchemeCalc";

export default function EditSavingsSchemePage() {
    const [schemes, setSchemes] = useState<PersonalScheme[]>([]);
    const [selectedScheme, setSelectedScheme] = useState<PersonalScheme | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const [form, setForm] = useState<{
        schemeName: string;
        schemeType: SchemeType;
        status: "ACTIVE" | "INACTIVE";
        installmentAmount: number;
        durationMonths: number;
        benefitMonths: number;
        benefitWeeks: number;
        benefitDays: number;
        description: string;
    }>({
        schemeName: "",
        schemeType: "STANDARD",
        status: "ACTIVE",
        installmentAmount: 100,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        description: "",
    });

    useEffect(() => {
        let isMounted = true;
        async function fetchSchemes() {
            try {
                const res = await fetch("/api/personal/schemes");
                const data = await res.json();
                if (isMounted && data.success) {
                    setSchemes(data.schemes || []);
                }
            } catch (err) {
                console.error("Failed to load schemes:", err);
            }
        }
        fetchSchemes();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSelect = (s: PersonalScheme) => {
        setSelectedScheme(s);
        setForm({
            schemeName: s.schemeName || "",
            schemeType: s.schemeType || (s.benefitMonths === 2 && !s.benefitWeeks && !s.benefitDays ? "STANDARD" : "CUSTOM"),
            status: s.status || "ACTIVE",
            installmentAmount: s.installmentAmount || 100,
            durationMonths: s.durationMonths || 12,
            benefitMonths: s.benefitMonths !== undefined ? s.benefitMonths : 2,
            benefitWeeks: s.benefitWeeks || 0,
            benefitDays: s.benefitDays || 0,
            description: s.description || "",
        });
    };

    // Live calculation for preview
    const previewCalc = selectedScheme ? calculatePersonalSchemeValues({
        frequency: selectedScheme.frequency,
        installmentAmount: form.installmentAmount,
        durationMonths: form.durationMonths,
        benefitMonths: form.schemeType === "STANDARD" ? 2 : form.benefitMonths,
        benefitWeeks: form.schemeType === "STANDARD" ? 0 : form.benefitWeeks,
        benefitDays: form.schemeType === "STANDARD" ? 0 : form.benefitDays,
    }) : null;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedScheme) return;

        setLoading(true);
        try {
            const payload = {
                ...form,
                benefitMonths: form.schemeType === "STANDARD" ? 2 : form.benefitMonths,
                benefitWeeks: form.schemeType === "STANDARD" ? 0 : form.benefitWeeks,
                benefitDays: form.schemeType === "STANDARD" ? 0 : form.benefitDays,
            };

            const res = await fetch(`/api/personal/schemes/${selectedScheme._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success && data.scheme) {
                toast.success("Scheme updated successfully");
                setSchemes((prev) =>
                    prev.map((s) => (s._id === selectedScheme._id ? data.scheme : s))
                );
                setSelectedScheme(data.scheme);
            } else {
                toast.error(data.message || "Failed to update scheme");
            }
        } catch (error) {
            console.error("Failed to update scheme:", error);
            toast.error("Network error while updating scheme");
        } finally {
            setLoading(false);
        }
    };

    const filtered = schemes.filter(
        (s) =>
            s.schemeName.toLowerCase().includes(search.toLowerCase()) ||
            s.schemeId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-amber-500" />
                    Modify Savings Schemes
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                    Update titles, benefits (months, weeks, days), installments, and active status of savings plans.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* List Selector */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 md:col-span-1 shadow-xs max-h-[680px] overflow-y-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Filter schemes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        {filtered.map((s) => (
                            <button
                                key={s._id}
                                onClick={() => handleSelect(s)}
                                className={`w-full text-left p-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                                    selectedScheme?._id === s._id
                                        ? "bg-[#241E4E] text-amber-300 border-[#241E4E] shadow-md ring-2 ring-amber-400/50"
                                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{s.schemeId}</span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                        {s.frequency}
                                    </span>
                                </div>
                                <p className="text-sm font-bold truncate mt-1 text-slate-900 group-hover:text-amber-900">
                                    {s.schemeName}
                                </p>
                                <div className="flex justify-between items-center text-[11px] mt-1 text-slate-500">
                                    <span>₹ {s.installmentAmount?.toLocaleString()} / cycle</span>
                                    <span className="text-emerald-600 font-bold">
                                        + ₹ {s.benefitAmount?.toLocaleString()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Edit Form */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 md:col-span-2 shadow-xs">
                    {selectedScheme && previewCalc ? (
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div className="flex justify-between items-center border-b pb-3">
                                <div>
                                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                                        {selectedScheme.schemeId}
                                    </span>
                                    <h3 className="text-base font-bold text-slate-900 mt-1">Scheme Configuration</h3>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 uppercase text-slate-800">
                                    {selectedScheme.frequency}
                                </span>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Scheme Title</label>
                                    <Input
                                        value={form.schemeName}
                                        onChange={(e) => setForm({ ...form, schemeName: e.target.value })}
                                        required
                                        className="rounded-xl font-bold text-sm"
                                    />
                                </div>

                                {/* Scheme Type Toggle */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-amber-500" />
                                        Scheme Benefit Mode
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, schemeType: "STANDARD", benefitMonths: 2, benefitWeeks: 0, benefitDays: 0 })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                form.schemeType === "STANDARD"
                                                    ? "bg-[#241E4E] text-amber-300 border-[#241E4E] shadow-xs"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            Standard (2 Months)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, schemeType: "CUSTOM" })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                form.schemeType === "CUSTOM"
                                                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            Customized Benefits
                                        </button>
                                    </div>
                                </div>

                                {/* Benefit Months, Weeks, Days Inputs */}
                                {form.schemeType === "CUSTOM" ? (
                                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-amber-950 uppercase text-[11px] flex items-center gap-1">
                                                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                                                Benefit Duration
                                            </span>
                                            <div className="flex gap-1.5">
                                                {[2, 3, 4].map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, benefitMonths: m, benefitWeeks: 0, benefitDays: 0 })}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                                            form.benefitMonths === m && form.benefitWeeks === 0 && form.benefitDays === 0
                                                                ? "bg-amber-500 text-slate-950 border-amber-500"
                                                                : "bg-white text-slate-700 border-slate-200"
                                                        }`}
                                                    >
                                                        {m} Mo
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">Months</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={24}
                                                    value={form.benefitMonths}
                                                    onChange={(e) => setForm({ ...form, benefitMonths: Math.max(0, Number(e.target.value)) })}
                                                    className="rounded-xl font-bold bg-white text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">Weeks</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={52}
                                                    value={form.benefitWeeks}
                                                    onChange={(e) => setForm({ ...form, benefitWeeks: Math.max(0, Number(e.target.value)) })}
                                                    className="rounded-xl font-bold bg-white text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">Days</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={365}
                                                    value={form.benefitDays}
                                                    onChange={(e) => setForm({ ...form, benefitDays: Math.max(0, Number(e.target.value)) })}
                                                    className="rounded-xl font-bold bg-white text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                                        <span>Standard Scheme Benefit: <strong>2 Months</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, schemeType: "CUSTOM", benefitMonths: 3 })}
                                            className="text-amber-700 font-bold underline cursor-pointer"
                                        >
                                            Change to 3 or 4 Months
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-600 uppercase">Installment Amount (₹)</label>
                                        <Input
                                            type="number"
                                            min={10}
                                            step={10}
                                            value={form.installmentAmount}
                                            onChange={(e) => setForm({ ...form, installmentAmount: Math.max(0, Number(e.target.value)) })}
                                            required
                                            className="rounded-xl font-bold text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-600 uppercase">Tenure Months</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={form.durationMonths}
                                            onChange={(e) => setForm({ ...form, durationMonths: Math.max(1, Number(e.target.value)) })}
                                            className="rounded-xl font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Live Value Summary Card */}
                                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                                    <div>
                                        <p className="text-slate-400 font-bold uppercase text-[9px]">Contribution</p>
                                        <p className="text-sm font-black text-slate-900 mt-0.5">
                                            ₹ {previewCalc.totalContribution.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-emerald-600 font-bold uppercase text-[9px]">Bonus ({previewCalc.benefitDescriptionText})</p>
                                        <p className="text-sm font-black text-emerald-600 mt-0.5">
                                            + ₹ {previewCalc.benefitAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-amber-600 font-bold uppercase text-[9px]">Maturity Payout</p>
                                        <p className="text-sm font-black text-amber-600 mt-0.5">
                                            ₹ {previewCalc.maturityAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Active Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold outline-none cursor-pointer"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">Description</label>
                                    <textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="w-full rounded-xl border border-slate-300 p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#241E4E] hover:bg-[#2F2864] text-amber-300 font-bold rounded-xl px-6 cursor-pointer"
                                >
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="py-24 text-center text-slate-400 font-medium">
                            Select a scheme from the left panel to edit.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
