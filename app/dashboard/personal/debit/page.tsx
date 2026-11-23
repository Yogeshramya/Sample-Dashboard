"use client";

import { useRouter } from "next/navigation";
import {
    PlusCircle,
    Edit,
    FileSpreadsheet,
    ChevronRight,
    Tags,
    ArrowLeft,
    PiggyBank,
} from "lucide-react";

export default function PersonalDebitPage() {
    const router = useRouter();

    const actions = [
        {
            title: "Expense Entry",
            description: "Log a new smart savings operational expense.",
            icon: <PlusCircle className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/debit/entry"),
        },
        {
            title: "Modify / Remove",
            description: "Edit, review, or delete smart savings expense records.",
            icon: <Edit className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/debit/manage"),
        },
        {
            title: "Expense Titles",
            description: "Manage dedicated categories and heads for savings expenses.",
            icon: <Tags className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/debit/title"),
        },
    ];

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-950/10 pb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E] border border-[#7C5CFC]/30 text-[#7C5CFC] text-xs font-bold tracking-wide uppercase">
                        <PiggyBank className="w-4 h-4 text-[#7C5CFC]" />
                        Smart Savings &bull; Expense Ledger
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Savings Expenses (Debit)
                    </h1>
                    <p className="text-slate-600 font-medium text-sm md:text-base">
                        Manage operational overheads, collector travel costs, passbook printing, and savings branch expenses.
                    </p>
                </div>

                <button
                    onClick={() => router.push("/dashboard/personal")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/30 transition-all cursor-pointer shadow-xs w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Savings Hub
                </button>
            </div>

            {/* Interactive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {actions.map((item, i) => (
                    <div
                        key={i}
                        onClick={item.action}
                        className="group relative flex items-center p-6 bg-white border border-slate-200/90 hover:border-[#7C5CFC] rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-[#7C5CFC]/10 select-none overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#1C173D] border border-[#7C5CFC]/30 shadow-md group-hover:scale-105 transition-transform duration-300">
                            {item.icon}
                        </div>

                        <div className="relative z-10 flex-1 ml-5 pr-4">
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-[#241E4E] transition-colors duration-200">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        <div className="relative z-10 shrink-0 w-11 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-[#7C5CFC] group-hover:border-[#7C5CFC] group-hover:text-slate-950 transition-all duration-300 shadow-2xs">
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
