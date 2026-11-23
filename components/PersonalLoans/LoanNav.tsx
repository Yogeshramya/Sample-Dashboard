"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    PlusCircle,
    Users,
    CheckCircle2,
    ShieldCheck,
    Coins,
    Banknote,
    CalendarCheck,
    Clock,
    Scale,
    AlertTriangle,
    Lock,
    BarChart3,
    LayoutDashboard,
} from "lucide-react";

export default function LoanNav() {
    const pathname = usePathname();

    const links = [
        { name: "Overview", href: "/dashboard/personal/loans", icon: LayoutDashboard },
        { name: "New Application", href: "/dashboard/personal/loans/new", icon: PlusCircle, highlight: true },
        { name: "Eligibility Check", href: "/dashboard/personal/loans/eligibility", icon: CheckCircle2 },
        { name: "Borrowers", href: "/dashboard/personal/loans/customers", icon: Users },
        { name: "Verification", href: "/dashboard/personal/loans/verification", icon: ShieldCheck },
        { name: "Approval", href: "/dashboard/personal/loans/approval", icon: Coins },
        { name: "Disbursement", href: "/dashboard/personal/loans/disbursement", icon: Banknote },
        { name: "Daily Collection", href: "/dashboard/personal/loans/collections/daily", icon: CalendarCheck },
        { name: "Weekly / EMI", href: "/dashboard/personal/loans/collections/weekly", icon: Clock },
        { name: "Outstanding", href: "/dashboard/personal/loans/outstanding", icon: Scale },
        { name: "Overdue / Arrears", href: "/dashboard/personal/loans/overdue", icon: AlertTriangle },
        { name: "Loan Closure", href: "/dashboard/personal/loans/closure", icon: Lock },
        { name: "Reports", href: "/dashboard/personal/report/loan-reports", icon: BarChart3 },
    ];

    return (
        <div className="w-full bg-[#241E4E] border border-[#7C5CFC]/30 rounded-2xl shadow-md p-1.5 mb-6 overflow-x-auto no-scrollbar print:hidden">
            <div className="flex items-center gap-1.5 min-w-max">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                isActive
                                    ? "bg-[#7C5CFC] text-white shadow-sm font-bold"
                                    : link.highlight
                                      ? "bg-[#2F2864] text-[#A78BFA] border border-[#7C5CFC]/40 hover:bg-[#383074]"
                                      : "text-purple-100/90 hover:bg-[#2F2864] hover:text-white"
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#7C5CFC]"}`} />
                            <span>{link.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

