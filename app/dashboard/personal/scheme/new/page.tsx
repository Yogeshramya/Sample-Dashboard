"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Layers, Save, Sparkles, CheckCircle2, Sliders, CalendarClock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PlanFrequency, SchemeType } from "@/types/personal";
import { calculatePersonalSchemeValues } from "@/lib/personalSchemeCalc";

export default function NewSavingsSchemePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [schemeName, setSchemeName] = useState("");
    const [schemeId, setSchemeId] = useState("");
    const [schemeType, setSchemeType] = useState<SchemeType>("STANDARD");
    const [frequency, setFrequency] = useState<PlanFrequency>("DAILY");
    const [installmentAmount, setInstallmentAmount] = useState<number>(100);
    const [durationMonths, setDurationMonths] = useState<number>(12);

    // Benefit breakdown
    const [benefitMonths, setBenefitMonths] = useState<number>(2);
    const [benefitWeeks, setBenefitWeeks] = useState<number>(0);
    const [benefitDays, setBenefitDays] = useState<number>(0);

    const [description, setDescription] = useState("");

    // Calculate live values
    const currentBenefitMonths = schemeType === "STANDARD" ? 2 : benefitMonths;
    const currentBenefitWeeks = schemeType === "STANDARD" ? 0 : benefitWeeks;
    const currentBenefitDays = schemeType === "STANDARD" ? 0 : benefitDays;

    const calc = calculatePersonalSchemeValues({
        frequency,
        installmentAmount,
        durationMonths,
        benefitMonths: currentBenefitMonths,
        benefitWeeks: currentBenefitWeeks,
        benefitDays: currentBenefitDays,
    });

    const handleSchemeTypeChange = (type: SchemeType) => {
        setSchemeType(type);
        if (type === "STANDARD") {
            setBenefitMonths(2);
            setBenefitWeeks(0);
            setBenefitDays(0);
        } else {
            // Default customized scheme to 3 months benefit
            if (benefitMonths === 2 && benefitWeeks === 0 && benefitDays === 0) {
                setBenefitMonths(3);
            }
        }
    };

    const applyPresetMonths = (months: number) => {
        setSchemeType("CUSTOM");
        setBenefitMonths(months);
        setBenefitWeeks(0);
        setBenefitDays(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schemeName.trim()) return toast.error("Please enter a scheme name");
        if (installmentAmount <= 0) return toast.error("Installment amount must be greater than zero");

        setLoading(true);
        try {
            const res = await fetch("/api/personal/schemes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schemeId: schemeId.trim() || undefined,
                    schemeName: schemeName.trim(),
                    schemeType,
                    frequency,
                    installmentAmount,
                    durationMonths,
                    benefitMonths: currentBenefitMonths,
                    benefitWeeks: currentBenefitWeeks,
                    benefitDays: currentBenefitDays,
                    description,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Savings Scheme created successfully!");
                router.push("/dashboard/personal/scheme/list");
            } else {
                toast.error(data.message || "Failed to create scheme");
            }
        } catch {
            toast.error("Network error while creating scheme");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Layers className="w-8 h-8 text-amber-500" />
                    Create Savings Scheme
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                    Configure standard 2-month benefit plans or design customized schemes with flexible months, weeks, and days benefits.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Inputs */}
                    <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">

                        {/* 1. SCHEME TYPE SELECTION */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-amber-500" />
                                Scheme Type *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSchemeTypeChange("STANDARD")}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${schemeType === "STANDARD"
                                            ? "border-[#241E4E] bg-emerald-50/70 shadow-sm ring-2 ring-[#241E4E]"
                                            : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-sm text-[#241E4E]">Standard Plan</span>
                                        {schemeType === "STANDARD" && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Fixed 2 Months company benefit bonus on 12-month tenure.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSchemeTypeChange("CUSTOM")}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${schemeType === "CUSTOM"
                                            ? "border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500"
                                            : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-sm text-amber-900">Customized Scheme</span>
                                        {schemeType === "CUSTOM" && (
                                            <CheckCircle2 className="w-5 h-5 text-amber-600" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Choose flexible benefit duration: 3, 4, or custom months, weeks &amp; days.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 2. BASIC SCHEME DETAILS */}
                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Scheme Title *</label>
                                <Input
                                    value={schemeName}
                                    onChange={(e) => setSchemeName(e.target.value)}
                                    placeholder={
                                        schemeType === "CUSTOM"
                                            ? `e.g. Smart Daily ₹${installmentAmount} (${calc.benefitDescriptionText} Benefit)`
                                            : `e.g. Smart Daily ₹${installmentAmount} or Smart Monthly ₹1,000`
                                    }
                                    required
                                    className="rounded-xl font-bold text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Collection Frequency *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFrequency(f)}
                                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${frequency === f
                                                    ? "bg-[#241E4E] text-amber-400 border-[#241E4E] shadow-xs"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                }`}
                                        >
                                            {f === "DAILY" ? "Daily (30d = 1mo)" : f === "WEEKLY" ? "Weekly (52w)" : "Monthly (12mo)"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">
                                        Installment Amount (₹) *
                                    </label>
                                    <Input
                                        type="number"
                                        min={10}
                                        step={10}
                                        value={installmentAmount}
                                        onChange={(e) => setInstallmentAmount(Math.max(0, Number(e.target.value)))}
                                        required
                                        className="rounded-xl font-black text-lg"
                                    />
                                    <p className="text-[11px] text-slate-400">
                                        Per {frequency === "DAILY" ? "day" : frequency === "WEEKLY" ? "week" : "month"} collection
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-600 uppercase">
                                        Tenure / Duration (Months)
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={durationMonths}
                                        onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value)))}
                                        className="rounded-xl font-bold text-sm"
                                    />
                                    <p className="text-[11px] text-slate-400">
                                        Standard tenure is 12 Months
                                    </p>
                                </div>
                            </div>

                            {/* 3. BENEFIT SPECIFICATION (MONTHS, WEEKS, DAYS) */}
                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <label className="font-bold text-amber-950 uppercase text-xs flex items-center gap-1.5">
                                        <CalendarClock className="w-4 h-4 text-amber-600" />
                                        Company Benefit Duration
                                    </label>

                                    {/* Preset Quick Chips */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                                        {[2, 3, 4].map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => {
                                                    if (m === 2) {
                                                        handleSchemeTypeChange("STANDARD");
                                                    } else {
                                                        applyPresetMonths(m);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${currentBenefitMonths === m && currentBenefitWeeks === 0 && currentBenefitDays === 0
                                                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-2xs"
                                                        : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"
                                                    }`}
                                            >
                                                {m} Months
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {schemeType === "CUSTOM" ? (
                                    <div className="space-y-3 pt-1">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">
                                                    Benefit Months
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={24}
                                                    value={benefitMonths}
                                                    onChange={(e) => setBenefitMonths(Math.max(0, Number(e.target.value)))}
                                                    className="rounded-xl font-bold bg-white text-sm"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">
                                                    Benefit Weeks
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={52}
                                                    value={benefitWeeks}
                                                    onChange={(e) => setBenefitWeeks(Math.max(0, Number(e.target.value)))}
                                                    className="rounded-xl font-bold bg-white text-sm"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="font-bold text-slate-600 text-[10px] uppercase">
                                                    Benefit Days
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={365}
                                                    value={benefitDays}
                                                    onChange={(e) => setBenefitDays(Math.max(0, Number(e.target.value)))}
                                                    className="rounded-xl font-bold bg-white text-sm"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-amber-800 font-medium">
                                            Selected Benefit Addition: <strong className="font-bold text-amber-950">{calc.benefitDescriptionText}</strong> (+ ₹{calc.benefitAmount.toLocaleString()})
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white/80 rounded-xl border border-amber-200/50 flex items-center justify-between">
                                        <span className="text-xs text-slate-700 font-medium">
                                            Standard Plan Benefit: <strong className="font-bold text-slate-900">2 Months</strong> (+ ₹{calc.benefitAmount.toLocaleString()})
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Scheme ID / Code */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">
                                    Scheme Identifier / Code (Optional)
                                </label>
                                <Input
                                    value={schemeId}
                                    onChange={(e) => setSchemeId(e.target.value)}
                                    placeholder="Auto-generated if left empty (e.g. YPS-D100-3M)"
                                    className="rounded-xl font-mono text-xs uppercase"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-600 uppercase">Scheme Description</label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief terms or notes for branch officers and savers..."
                                    className="w-full rounded-xl border border-slate-300 p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Calculated Output Sidebar */}
                    <div className="bg-gradient-to-br from-[#1C173D] via-[#241E4E] to-[#1C173D] rounded-3xl p-6 text-white space-y-5 h-fit shadow-xl border border-[#7C5CFC]/30">
                        <div className="flex items-center gap-2 pb-3 border-b border-emerald-900/60">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <div>
                                <h3 className="font-bold text-sm text-amber-300">Live Scheme Value Breakdown</h3>
                                <p className="text-[10px] text-emerald-200/70">{schemeType === "CUSTOM" ? "Customized Plan" : "Standard 12+2 Plan"}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Subscriber Tenure:</span>
                                <span className="font-bold text-white">{calc.durationMonths} Months</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Total Installments:</span>
                                <span className="font-bold text-white">{calc.totalInstallments} ({frequency.toLowerCase()})</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Total Contribution:</span>
                                <span className="font-bold text-white">₹ {calc.totalContribution.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-amber-400 font-bold">
                                <span>Company Bonus ({calc.benefitDescriptionText}):</span>
                                <span>+ ₹ {calc.benefitAmount.toLocaleString()}</span>
                            </div>

                            <div className="pt-3 border-t border-emerald-900/60 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                                <p className="text-[10px] uppercase font-bold text-amber-400">Total Maturity Payout</p>
                                <p className="text-2xl font-black text-amber-300 mt-0.5">
                                    ₹ {calc.maturityAmount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-emerald-200/70 mt-1">
                                    ₹ {calc.totalContribution.toLocaleString()} deposit + ₹ {calc.benefitAmount.toLocaleString()} bonus
                                </p>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl py-5 text-sm cursor-pointer shadow-md"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Savings Scheme
                        </Button>
                    </div>
                </div>
            </form>
        </section>
    );
}
