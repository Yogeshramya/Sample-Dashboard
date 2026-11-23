"use client";

import { useRouter } from "next/navigation";
import {
    UserPlus,
    Search,
    Edit,
    FileText,
    ChevronRight,
    Users,
    UserCheck
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function PersonalClient() {
    const router = useRouter();

    const actions = [
        {
            title: "Add New Customer",
            description: "Register a new smart savings customer into the system.",
            icon: <UserPlus className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/client/new"),
        },
        {
            title: "Search Customer",
            description: "Locate clients by their ID, name, or phone number.",
            icon: <Search className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/client/search"),
        },
        {
            title: "Active Loan Customers",
            description: "List of all active loan customers.",
            icon: <Users className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/client/list"),
        },
        {
            title: "Modify / Remove",
            description: "Update details or remove a customer's record.",
            icon: <Edit className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/client/edit"),
        },
        {
            title: "Customer NOC",
            description: "Generate and export No Objection Certificates.",
            icon: <FileText className="w-7 h-7 text-[#7C5CFC]" />,
            action: () => router.push("/dashboard/personal/client/noc"),
        },
    ];

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <PageHeader />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-100 pb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241E4E]/10 border border-[#7C5CFC]/40 text-[#241E4E] text-xs font-bold tracking-wide uppercase mb-2">
                        <Users className="w-4 h-4 text-[#7C5CFC]" />
                        Smart Savings Savers
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#241E4E] tracking-tight">
                        Customer Management
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Register, search, and manage individual smart savings plan customers.
                    </p>
                </div>
            </div>

            {/* Interactive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {actions.map((item, i) => (
                    <div
                        key={i}
                        onClick={item.action}
                        className="group relative flex items-center p-6 bg-white border border-emerald-100 hover:border-[#7C5CFC] rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 overflow-hidden"
                    >
                        {/* Hover Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Icon Block */}
                        <div className="relative z-10 shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#241E4E] to-[#2F2864] border border-[#7C5CFC]/30 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                            {item.icon}
                        </div>

                        {/* Text Content */}
                        <div className="relative z-10 flex-1 ml-6 pr-4">
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-[#241E4E] transition-colors duration-300">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        {/* Action Arrow */}
                        <div className="relative z-10 shrink-0 w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-[#7C5CFC] group-hover:border-[#7C5CFC] text-slate-400 group-hover:text-slate-950 transition-all duration-300 shadow-sm group-hover:shadow-md">
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
