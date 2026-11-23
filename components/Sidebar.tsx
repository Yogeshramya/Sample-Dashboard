"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    X,
    LayoutDashboard,
    MapPin,
    Users,
    Wallet,
    Layers,
    Receipt,
    BarChart3,
    Scale,
    TrendingUp,
    TrendingDown,
    CheckSquare,
    Building2,
    Briefcase,
    Coins,
    ArrowRightLeft,
    ChevronDown,
} from "lucide-react";
import Image from "next/image";

interface TabSubItem {
    name: string;
    path: string;
}

interface TabItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    subItems?: TabSubItem[];
}

export default function Sidebar({
    setIsOpen,
}: {
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    const role = session?.user?.role;

    // 1. Initialize stored module lazily to avoid state-setting effects
    const [storedModule, setStoredModule] = useState<"MFI" | "PERSONAL">(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("loanModule");
            if (stored === "MFI" || stored === "PERSONAL") {
                return stored;
            }
        }
        return "MFI";
    });

    const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "v2.003";
    const CYRAX_URL = "https://cyrax.cloud";

    /* ---------------- MODULE SYNC ACROSS TABS/NAVBAR ---------------- */
    useEffect(() => {
        const syncModule = () => {
            const current = localStorage.getItem("loanModule");
            if (current === "MFI" || current === "PERSONAL") {
                setStoredModule(current);
            }
        };

        window.addEventListener("loanModuleChange", syncModule);
        return () => window.removeEventListener("loanModuleChange", syncModule);
    }, []);

    // 2. Derive current active module directly from URL pathname if applicable
    let activeLoanModule: "MFI" | "PERSONAL" = storedModule;
    if (pathname.includes("/dashboard/personal")) {
        activeLoanModule = "PERSONAL";
    } else if (pathname.startsWith("/dashboard")) {
        activeLoanModule = "MFI";
    }

    // Keep localStorage synchronized when URL shifts
    useEffect(() => {
        if (pathname.includes("/dashboard/personal")) {
            localStorage.setItem("loanModule", "PERSONAL");
        } else if (pathname.startsWith("/dashboard")) {
            localStorage.setItem("loanModule", "MFI");
        }
    }, [pathname]);

    const [reportSubmenuOpen, setReportSubmenuOpen] = useState(() => pathname.includes("/report"));

    useEffect(() => {
        if (pathname.includes("/report")) {
            setReportSubmenuOpen(true);
        }
    }, [pathname]);

    /* ---------------- TAB CONFIGURATION ---------------- */

    const isPersonal = activeLoanModule === "PERSONAL";

    const constantBaseTabs = [
        {
            name: "Dashboard",
            path: isPersonal ? "/dashboard/personal" : "/dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
            name: "Report",
            path: isPersonal ? "/dashboard/personal/report" : "/dashboard/report",
            icon: <BarChart3 className="w-5 h-5" />,
            subItems: isPersonal
                ? [
                    { name: "Report Hub", path: "/dashboard/personal/report" },
                    { name: "Day Accounts", path: "/dashboard/personal/report/day-sheet" },
                    { name: "Deposit Report", path: "/dashboard/personal/report/deposit-report" },
                    { name: "Loan Disbursements", path: "/dashboard/personal/report/disbursement" },
                    { name: "Loan Collections", path: "/dashboard/personal/report/collections" },
                    { name: "Loan Arrears & Dues", path: "/dashboard/personal/report/arrears" },
                    { name: "Loan Outstanding", path: "/dashboard/personal/report/outstanding" },
                    { name: "Loan Closures", path: "/dashboard/personal/report/closure" },
                    { name: "Master Loan Register", path: "/dashboard/personal/report/loan-reports" },
                ]
                : undefined,
        },
        {
            name: "Trial Balance",
            path: isPersonal ? "/dashboard/personal/trial-balance" : "/dashboard/trial-balance",
            icon: <Scale className="w-5 h-5" />,
        },
    ];

    const mfiTabs = [
        { name: "Center", path: "/dashboard/group", icon: <MapPin className="w-5 h-5" /> },
        { name: "Customer", path: "/dashboard/client", icon: <Users className="w-5 h-5" /> },
        { name: "Loan", path: "/dashboard/fund", icon: <Wallet className="w-5 h-5" /> },
        { name: "Scheme", path: "/dashboard/scheme", icon: <Layers className="w-5 h-5" /> },
        { name: "Payment", path: "/dashboard/bill", icon: <Receipt className="w-5 h-5" /> },
    ];

    const personalTabs = [
        { name: "Customer", path: "/dashboard/personal/client", icon: <Users className="w-5 h-5" /> },
        { name: "New Savings/Loan", path: "/dashboard/personal/fund", icon: <Wallet className="w-5 h-5" /> },
        { name: "Personal Loan", path: "/dashboard/personal/loans", icon: <Coins className="w-5 h-5" /> },
        { name: "Scheme", path: "/dashboard/personal/scheme", icon: <Layers className="w-5 h-5" /> },
        { name: "Payment / Deposit", path: "/dashboard/personal/bill", icon: <Receipt className="w-5 h-5" /> },
    ];

    const managerTabs = [
        {
            name: "Income",
            path: isPersonal ? "/dashboard/personal/credit" : "/dashboard/credit",
            icon: <TrendingUp className="w-5 h-5" />,
        },
        {
            name: "Expenses",
            path: isPersonal ? "/dashboard/personal/debit" : "/dashboard/debit",
            icon: <TrendingDown className="w-5 h-5" />,
        },
    ];

    const adminTabs = [
        {
            name: "Remittance",
            path: isPersonal ? "/dashboard/personal/remittance" : "/dashboard/remittance",
            icon: <ArrowRightLeft className="w-5 h-5" />,
        },
        {
            name: "Income",
            path: isPersonal ? "/dashboard/personal/credit" : "/dashboard/credit",
            icon: <TrendingUp className="w-5 h-5" />,
        },
        {
            name: "Expenses",
            path: isPersonal ? "/dashboard/personal/debit" : "/dashboard/debit",
            icon: <TrendingDown className="w-5 h-5" />,
        },
        {
            name: "Approval",
            path: isPersonal ? "/dashboard/personal/approval" : "/dashboard/approval",
            icon: <CheckSquare className="w-5 h-5" />,
        },
        ...(!isPersonal
            ? [
                {
                    name: "Branches",
                    path: "/dashboard/branches",
                    icon: <Building2 className="w-5 h-5" />,
                },
                {
                    name: "Staffs",
                    path: "/dashboard/employees",
                    icon: <Briefcase className="w-5 h-5" />,
                },
                ...(role === "ADMINISTRATOR"
                    ? [
                        {
                            name: "Staff Payroll",
                            path: "/dashboard/staff-salary",
                            icon: <Coins className="w-5 h-5" />,
                        },
                    ]
                    : []),
            ]
            : []),
    ];

    /* ---------------- FINAL MENU COMPILATION ---------------- */

    const currentModuleTabs = isPersonal ? personalTabs : mfiTabs;

    const roleTabs =
        role === "ADMINISTRATOR" || role === "ACCOUNTS_HEAD"
            ? adminTabs
            : role === "MANAGER" || role === "TELLER" || role === "AREA_MANAGER"
                ? managerTabs
                : [];

    const finalTabs: TabItem[] = [...constantBaseTabs, ...currentModuleTabs, ...roleTabs];

    const handleNavigate = (path: string) => {
        router.push(path);
        if (setIsOpen) setIsOpen(false);
    };

    return (
        <aside className={`h-full w-full flex flex-col print:hidden shadow-xl z-50 transition-colors duration-300 ${isPersonal ? "bg-[#241E4E] border-r border-[#7C5CFC]/30 text-white" : "bg-white/95 backdrop-blur-xl border-r border-[#E8E7F0] text-slate-800"}`}>
            {/* Top Section */}
            <div className="p-4 md:p-5 overflow-y-auto flex-1 no-scrollbar">
                {/* Mobile Close */}
                <div className="flex items-center justify-between mb-6 md:hidden">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7C5CFC]" />
                        {isPersonal ? "Smart Savings" : "MFI Menu"}
                    </h2>
                    <button
                        onClick={() => setIsOpen?.(false)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-[#EDE9FE] text-slate-600 hover:text-[#7C5CFC] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Module Badge Indicator */}
                <div className={`mb-3 px-3 py-1.5 rounded-xl flex items-center justify-between ${isPersonal ? "bg-[#2F2864] border border-[#7C5CFC]/30 shadow-xs" : "bg-[#EDE9FE] border border-[#DDD6FE]"}`}>
                    <span className={`text-[11px] font-black tracking-wider uppercase ${isPersonal ? "text-[#A78BFA]" : "text-[#6846EB]"}`}>
                        {isPersonal ? "Smart Savings" : "Microfinance (MFI)"}
                    </span>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isPersonal ? "bg-[#7C5CFC]" : "bg-[#7C5CFC]"}`} />
                </div>

                {/* Navigation */}
                <nav className="space-y-1.5">
                    {finalTabs.map((tab) => {
                        const hasSub = Boolean(tab.subItems && tab.subItems.length > 0);
                        const isCurrentTab =
                            pathname === tab.path ||
                            (pathname.startsWith(tab.path + "/") &&
                                tab.path !== "/dashboard" &&
                                tab.path !== "/dashboard/personal");
                        const active = isCurrentTab;

                        if (hasSub && tab.subItems) {
                            return (
                                <div key={tab.path} className="space-y-1">
                                    <div
                                        className={`w-full flex items-center justify-between rounded-xl transition-all duration-200 group ${
                                            active
                                                ? "bg-[#7C5CFC] text-white font-bold shadow-md shadow-[#7C5CFC]/25"
                                                : isPersonal
                                                    ? "font-medium text-purple-100/85 hover:bg-[#2F2864] hover:text-white border border-transparent hover:border-[#7C5CFC]/30"
                                                    : "font-medium hover:bg-[#EDE9FE]/60 text-slate-600 hover:text-slate-900 border border-transparent hover:border-[#DDD6FE]"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleNavigate(tab.path)}
                                            className="flex-1 flex items-center gap-3 text-left px-4 py-3 cursor-pointer"
                                        >
                                            <span
                                                className={`${
                                                    active
                                                        ? "text-white"
                                                        : isPersonal
                                                            ? "text-[#A78BFA] group-hover:text-white"
                                                            : "text-slate-400 group-hover:text-[#7C5CFC]"
                                                } transition-colors`}
                                            >
                                                {tab.icon}
                                            </span>
                                            <span className="truncate">{tab.name}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReportSubmenuOpen((prev) => !prev);
                                            }}
                                            className={`p-2.5 mr-1 rounded-lg transition cursor-pointer ${
                                                active
                                                    ? "text-white hover:bg-white/10"
                                                    : isPersonal
                                                        ? "text-purple-300 hover:text-white hover:bg-[#1C173D]"
                                                        : "text-slate-400 hover:text-[#7C5CFC] hover:bg-[#EDE9FE]"
                                            }`}
                                            title={reportSubmenuOpen ? "Collapse reports" : "Expand reports"}
                                        >
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform duration-200 ${
                                                    reportSubmenuOpen ? "rotate-180" : ""
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {reportSubmenuOpen && (
                                        <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#7C5CFC]/30 ml-5 my-1">
                                            {tab.subItems.map((sub) => {
                                                const subActive = pathname === sub.path;
                                                return (
                                                    <button
                                                        key={sub.path}
                                                        type="button"
                                                        onClick={() => handleNavigate(sub.path)}
                                                        className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                                                            subActive
                                                                ? "bg-[#7C5CFC] text-white font-bold shadow-xs"
                                                                : isPersonal
                                                                    ? "text-purple-200/80 hover:text-white hover:bg-[#2F2864]/70"
                                                                    : "text-slate-600 hover:text-slate-900 hover:bg-[#EDE9FE]"
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                subActive ? "bg-white" : "bg-[#7C5CFC]"
                                                            }`}
                                                        />
                                                        <span className="truncate">{sub.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <button
                                key={tab.path}
                                onClick={() => handleNavigate(tab.path)}
                                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 group cursor-pointer ${
                                    active
                                        ? "bg-[#7C5CFC] text-white font-bold shadow-md shadow-[#7C5CFC]/25"
                                        : isPersonal
                                            ? "font-medium text-purple-100/85 hover:bg-[#2F2864] hover:text-white border border-transparent hover:border-[#7C5CFC]/30"
                                            : "font-medium hover:bg-[#EDE9FE]/60 text-slate-600 hover:text-slate-900 border border-transparent hover:border-[#DDD6FE]"
                                }`}
                            >
                                <span
                                    className={`${
                                        active
                                            ? "text-white"
                                            : isPersonal
                                                ? "text-[#A78BFA] group-hover:text-white"
                                                : "text-slate-400 group-hover:text-[#7C5CFC]"
                                    } transition-colors`}
                                >
                                    {tab.icon}
                                </span>
                                {tab.name}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Version Section */}
            <div className={`border-t p-4 transition-colors ${isPersonal ? "border-[#7C5CFC]/20 bg-[#1C173D]" : "border-[#E8E7F0] bg-slate-50/80 backdrop-blur-md"}`}>
                <button
                    onClick={() => window.open(CYRAX_URL, "_blank")}
                    className={`w-full flex items-center justify-between rounded-xl p-2.5 transition-all group ${isPersonal ? "hover:bg-[#2F2864] border border-transparent hover:border-[#7C5CFC]/30" : "hover:bg-white hover:shadow-sm hover:border-[#DDD6FE] border border-transparent"}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
                            <Image
                                src="/default/cyrax.png"
                                alt="Cyrax"
                                fill
                                sizes="36px"
                                loading="eager"
                                className="object-contain p-1"
                            />
                        </div>

                        <div className="text-left">
                            <p className={`text-xs font-bold transition-colors ${isPersonal ? "text-purple-100 group-hover:text-[#7C5CFC]" : "text-slate-800 group-hover:text-[#7C5CFC]"}`}>
                                Powered by Cyrax
                            </p>
                            <p className={`text-[10px] font-medium ${isPersonal ? "text-purple-300/70" : "text-slate-500"}`}>
                                {VERSION}
                            </p>
                        </div>
                    </div>

                    <svg
                        className="h-4 w-4 text-slate-400 group-hover:text-[#7C5CFC] transition-transform group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </aside>
    );
}
