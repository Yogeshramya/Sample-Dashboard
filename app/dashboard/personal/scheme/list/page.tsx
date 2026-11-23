"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, PlusCircle, ChevronRight, Sliders, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PersonalScheme } from "@/types/personal";
import { formatSchemeBenefitLabel } from "@/lib/personalSchemeCalc";

export default function SavingsSchemeListPage() {
    const router = useRouter();
    const [schemes, setSchemes] = useState<PersonalScheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [freqFilter, setFreqFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "STANDARD" | "CUSTOM">("ALL");

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
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchSchemes();
        return () => {
            isMounted = false;
        };
    }, []);

    const filtered = schemes.filter((s) => {
        const matchesFreq = freqFilter === "ALL" || s.frequency === freqFilter;
        const isCustom = s.schemeType === "CUSTOM" || (s.benefitMonths !== undefined && s.benefitMonths !== 2) || (s.benefitWeeks && s.benefitWeeks > 0) || (s.benefitDays && s.benefitDays > 0);
        const matchesType =
            typeFilter === "ALL" ||
            (typeFilter === "CUSTOM" ? isCustom : !isCustom);
        return matchesFreq && matchesType;
    });

    return (
        <section className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Layers className="w-8 h-8 text-amber-500" />
                        Active Savings Schemes Directory
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Directory of standard plans and customized savings schemes with tailored company benefits.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push("/dashboard/personal/scheme/new")}
                        className="bg-[#241E4E] hover:bg-[#2F2864] text-amber-300 font-bold rounded-xl cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Scheme
                    </Button>
                </div>
            </div>

            {/* Filter Ribbons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Frequency Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                    {(["ALL", "DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFreqFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                freqFilter === f
                                    ? "bg-[#241E4E] text-amber-400 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            {f === "ALL" ? "All Frequencies" : f === "DAILY" ? "Daily (30d = 1mo)" : f === "WEEKLY" ? "Weekly" : "Monthly (12mo)"}
                        </button>
                    ))}
                </div>

                {/* Scheme Type Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                    {(["ALL", "STANDARD", "CUSTOM"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                typeFilter === t
                                    ? "bg-amber-500 text-slate-950 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            {t === "ALL" ? "All Types" : t === "STANDARD" ? "Standard (2-Mo)" : "Custom Schemes"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scheme Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((s) => {
                    const benefitLabel = formatSchemeBenefitLabel(s);
                    const isCustom = s.schemeType === "CUSTOM" || (s.benefitMonths !== undefined && s.benefitMonths !== 2) || (s.benefitWeeks && s.benefitWeeks > 0) || (s.benefitDays && s.benefitDays > 0);

                    return (
                        <Card
                            key={s._id}
                            className="bg-white border-slate-200 hover:border-amber-400 rounded-3xl shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
                        >
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                {s.schemeId}
                                            </span>
                                            {isCustom ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                                    Customized
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    Standard
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mt-1">{s.schemeName}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                                        {s.frequency}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed min-h-8">
                                    {s.description || `${s.durationMonths || 12} Months regular savings with ${benefitLabel} company bonus benefit.`}
                                </p>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Installment Amount:</span>
                                        <span className="font-bold text-slate-900 text-sm">
                                            ₹ {s.installmentAmount?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/{s.frequency.toLowerCase()}</span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">{s.durationMonths || 12}-Mo Contribution:</span>
                                        <span className="font-semibold text-slate-800">
                                            ₹ {s.totalContribution?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                                        <span>Company Bonus ({benefitLabel}):</span>
                                        <span>+ ₹ {s.benefitAmount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-linear-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Maturity Payout</p>
                                        <p className="text-xl font-black text-slate-900">
                                            ₹ {s.maturityAmount?.toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                                        Payout Total
                                    </span>
                                </div>

                                <Button
                                    onClick={() => router.push(`/dashboard/personal/fund/new?schemeId=${s._id}`)}
                                    className="w-full bg-[#241E4E] hover:bg-[#2F2864] text-amber-400 font-bold rounded-xl text-xs py-2 h-9 cursor-pointer"
                                >
                                    Enroll Saver in this Plan
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 font-medium">
                        No savings schemes found matching current filters.
                    </div>
                )}
            </div>
        </section>
    );
}
