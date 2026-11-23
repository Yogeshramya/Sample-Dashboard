"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Calculator,
    FileSpreadsheet,
    History,
    ChevronRight,
    Coins,
} from "lucide-react";

export default function StaffSalaryMenuPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "loading") return;
        if (!session || session.user.role !== "ADMINISTRATOR") {
            router.replace("/dashboard");
        }
    }, [session, status, router]);

    if (status === "loading" || session?.user?.role !== "ADMINISTRATOR") {
        return null;
    }

    const actions = [
        {
            title: "Salary Calculator",
            description: "Calculate monthly salary, LOP deductions, and issue staff payslips.",
            icon: <Calculator className="w-7 h-7 text-amber-400" />,
            action: () => router.push("/dashboard/staff-salary/calculator"),
        },
        {
            title: "Salary Sheet",
            description: "Consolidated monthly salary register with export and print features.",
            icon: <FileSpreadsheet className="w-7 h-7 text-amber-400" />,
            action: () => router.push("/dashboard/staff-salary/sheet"),
        },
        {
            title: "Salary History",
            description: "Check all issued salary records, search vouchers, and reprint payslips.",
            icon: <History className="w-7 h-7 text-amber-400" />,
            action: () => router.push("/dashboard/staff-salary/history"),
        }
    ];

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200 text-amber-700 text-xs font-bold tracking-wide uppercase">
                        <Coins className="w-4 h-4" />
                        Staff Payroll & HR
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Staff Salary Management
                    </h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">
                        Select an action below to calculate compensation, review monthly registers, and manage payslips.
                    </p>
                </div>
            </div>

            {/* Interactive Grid matching the reference layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {actions.map((item, i) => (
                    <div
                        key={i}
                        onClick={item.action}
                        className="group relative flex items-center p-6 bg-white border border-slate-200 hover:border-amber-400 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 select-none"
                    >
                        {/* Dark Icon Box */}
                        <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-md group-hover:scale-105 transition-transform duration-300">
                            {item.icon}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 ml-5 pr-4">
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors duration-200">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        {/* Circular Action Arrow */}
                        <div className="shrink-0 w-11 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-slate-950 transition-all duration-300 shadow-2xs">
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
