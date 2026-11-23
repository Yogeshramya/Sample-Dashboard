"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ClipboardCheck,
    UserCheck,
    PiggyBank,
    TrendingDown,
    TrendingUp,
    ArrowRightLeft,
    Award,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    CalendarCheck,
    Receipt,
} from "lucide-react";

interface ApprovalCounts {
    customers: number;
    plans: number;
    deposits: number;
    credits: number;
    debits: number;
    remittances: number;
    maturing: number;
    daySheets: number;
    total: number;
}

export default function PersonalApprovalHubPage() {
    const router = useRouter();
    const [counts, setCounts] = useState<ApprovalCounts>({
        customers: 0,
        plans: 0,
        deposits: 0,
        credits: 0,
        debits: 0,
        remittances: 0,
        maturing: 0,
        daySheets: 0,
        total: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetch("/api/personal/approvals?branchId=ALL")
            .then((r) => r.json())
            .then((data) => {
                if (isMounted && data.success) {
                    setCounts(data.counts);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const cards = [
        {
            title: "Customer Approvals",
            description: "Review KYC proofs and authorize newly registered smart savings customers.",
            icon: <UserCheck className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.customers,
            action: () => router.push("/dashboard/personal/approval/client"),
        },
        {
            title: "Savings Plan Approvals",
            description: "Review, verify documents, and activate newly enrolled savings plans for clients.",
            icon: <PiggyBank className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.plans,
            action: () => router.push("/dashboard/personal/fund/approval"),
        },
        {
            title: "Deposit Approvals",
            description: "Review and authorize member savings deposit collections and installment payments.",
            icon: <Receipt className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.deposits,
            action: () => router.push("/dashboard/personal/approval/deposit"),
        },
        {
            title: "Income Approvals",
            description: "Review and verify miscellaneous non-deposit income entries for Smart Savings.",
            icon: <TrendingUp className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.credits,
            action: () => router.push("/dashboard/personal/approval/credit"),
        },
        {
            title: "Expense Approvals",
            description: "Review and approve branch operating expenses and debit disbursements.",
            icon: <TrendingDown className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.debits,
            action: () => router.push("/dashboard/personal/approval/debit"),
        },
        {
            title: "Remittance Approvals",
            description: "Verify and approve incoming inter-branch and inter-module capital transfers.",
            icon: <ArrowRightLeft className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.remittances,
            action: () => router.push("/dashboard/personal/approval/remittance"),
        },
        {
            title: "Day Sheet Approvals",
            description: "Review cash denomination tallies and authorize daily closing balances.",
            icon: <CalendarCheck className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.daySheets,
            action: () => router.push("/dashboard/personal/approval/day-sheet"),
        },
        {
            title: "Settlement & Maturity Approvals",
            description: "Authorize maturity bonus payouts and close completed savings accounts.",
            icon: <Award className="w-7 h-7 text-[#7C5CFC]" />,
            badge: counts.maturing,
            action: () => router.push("/dashboard/personal/approval/settlement"),
        },
    ];

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-950/10 pb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <ClipboardCheck className="w-4 h-4 text-[#7C5CFC]" />
                        Smart Savings Authorization
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Dedicated Savings Approval Hub
                    </h1>
                    <p className="text-slate-600 font-medium text-sm md:text-base">
                        Centralized authorization center for Smart Savings customers, plans, day sheets, income, expense, remittances, and settlements.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#241E4E] border border-[#7C5CFC]/40 text-[#7C5CFC] text-xs font-bold shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-[#7C5CFC]" />
                        <span>{loading ? "..." : counts.total} Total Pending</span>
                    </div>

                    <button
                        onClick={() => router.push("/dashboard/personal")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Savings Hub
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cards.map((item, i) => (
                    <div
                        key={i}
                        onClick={item.action}
                        className="group relative flex flex-col justify-between p-6 bg-white border border-slate-200/90 hover:border-[#7C5CFC] rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-[#7C5CFC]/10 select-none min-h-[190px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#1C173D] border border-[#7C5CFC]/30 shadow-md group-hover:scale-105 transition-transform duration-300">
                                {item.icon}
                            </div>
                            <div className="flex items-center gap-2">
                                {item.badge > 0 ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#EDE9FE] text-[#7C5CFC] shadow-xs border border-[#7C5CFC]">
                                        {item.badge} Pending
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                        All Clear
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#241E4E] transition-colors duration-200">
                                {item.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#241E4E]">
                            <span>Review &amp; Authorize</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
