"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
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
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Sparkles,
} from "lucide-react";
import { Branch } from "@/types/next-auth";

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

export default function Topbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, update } = useSession();

    const role = session?.user?.role;
    const isPersonal = pathname.startsWith("/dashboard/personal");

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const tabButtonRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const floatingMenuRef = useRef<HTMLDivElement>(null);
    const dropdownCloseTimer = useRef<NodeJS.Timeout | null>(null);
    const navScrollRef = useRef<HTMLElement>(null);

    const updateDropdownPosition = (tabName: string) => {
        const el = tabButtonRefs.current[tabName];
        if (el) {
            const rect = el.getBoundingClientRect();
            const dropdownWidth = 256;
            let left = rect.left;
            if (left + dropdownWidth > window.innerWidth - 12) {
                left = Math.max(12, window.innerWidth - dropdownWidth - 12);
            }
            setDropdownCoords({
                top: rect.bottom + 6,
                left,
            });
        }
    };

    const handleOpenDropdown = (tabName: string) => {
        if (dropdownCloseTimer.current) {
            clearTimeout(dropdownCloseTimer.current);
            dropdownCloseTimer.current = null;
        }
        updateDropdownPosition(tabName);
        setOpenDropdown(tabName);
    };

    const handleScheduleCloseDropdown = () => {
        if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current);
        dropdownCloseTimer.current = setTimeout(() => {
            setOpenDropdown(null);
        }, 180);
    };

    const handleCancelCloseDropdown = () => {
        if (dropdownCloseTimer.current) {
            clearTimeout(dropdownCloseTimer.current);
            dropdownCloseTimer.current = null;
        }
    };

    const handleSlide = (direction: "left" | "right") => {
        if (!navScrollRef.current) return;
        const el = navScrollRef.current;
        const scrollAmount = Math.max(220, Math.floor(el.clientWidth * 0.65));

        // If tabs overflow the container width, scroll the tabs
        if (el.scrollWidth > el.clientWidth + 5) {
            if (direction === "left") {
                if (el.scrollLeft <= 5) {
                    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                } else {
                    el.scrollBy({ left: -scrollAmount, behavior: "smooth" });
                }
            } else {
                const maxScroll = el.scrollWidth - el.clientWidth;
                if (el.scrollLeft >= maxScroll - 5) {
                    el.scrollTo({ left: 0, behavior: "smooth" });
                } else {
                    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
                }
            }
        } else {
            // If all tabs fit on the screen without overflow, cycle to previous/next tab
            const currentIndex = finalTabs.findIndex(
                (t) => pathname === t.path || (pathname.startsWith(t.path + "/") && t.path !== "/dashboard" && t.path !== "/dashboard/personal")
            );
            if (direction === "right") {
                const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % finalTabs.length : 0;
                handleNavigate(finalTabs[nextIndex].path);
            } else {
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : finalTabs.length - 1;
                handleNavigate(finalTabs[prevIndex].path);
            }
        }
    };

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState("");

    // Read initial module from localStorage lazily
    const [loanModule, setLoanModule] = useState<"MFI" | "PERSONAL">(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("loanModule");
            if (stored === "MFI") {
                return stored;
            }
            if (stored === "PERSONAL") {
                localStorage.setItem("loanModule", "MFI");
            }
        }
        return "MFI";
    });

    const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "v2.003";
    const CYRAX_URL = "https://cyrax.cloud";

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const clickedInsideMenu = floatingMenuRef.current?.contains(target);
            const clickedInsideTab = openDropdown && tabButtonRefs.current[openDropdown]?.contains(target);
            if (!clickedInsideMenu && !clickedInsideTab) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdown]);

    // Close floating dropdown when scrolling tabs or resizing window
    useEffect(() => {
        const navEl = navScrollRef.current;
        if (!navEl) return;
        const handleScrollOrResize = () => {
            if (openDropdown) {
                setOpenDropdown(null);
            }
        };
        navEl.addEventListener("scroll", handleScrollOrResize, { passive: true });
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            navEl.removeEventListener("scroll", handleScrollOrResize);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [openDropdown]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setOpenDropdown(null);
    }, [pathname]);

    // Smoothly scroll active tab into view on route change
    useEffect(() => {
        if (navScrollRef.current) {
            const activeEl = navScrollRef.current.querySelector("[data-active='true']");
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
        }
    }, [pathname]);

    /* ---------------- KEEP MODULE SYNCED WITH PATHNAME ---------------- */
    useEffect(() => {
        if (pathname.startsWith("/dashboard/personal")) {
            setLoanModule("PERSONAL");
            localStorage.setItem("loanModule", "PERSONAL");
        } else if (pathname.startsWith("/dashboard")) {
            setLoanModule("MFI");
            localStorage.setItem("loanModule", "MFI");
        }
    }, [pathname]);

    /* ---------------- KEEP MODULE SYNCED ACROSS TABS ---------------- */
    useEffect(() => {
        const syncModule = () => {
            const current = localStorage.getItem("loanModule");
            if (current === "MFI" || current === "PERSONAL") {
                setLoanModule(current);
            }
        };

        window.addEventListener("loanModuleChange", syncModule);
        return () => window.removeEventListener("loanModuleChange", syncModule);
    }, []);

    const handleModuleChange = (module: string) => {
        const targetModule = module as "MFI" | "PERSONAL";
        setLoanModule(targetModule);
        localStorage.setItem("loanModule", targetModule);
        window.dispatchEvent(new Event("loanModuleChange"));
        if (targetModule === "PERSONAL") {
            router.push("/dashboard/personal");
        } else {
            router.push("/dashboard");
        }
    };

    /* ---------------- LOAD BRANCHES ---------------- */
    const userRole = session?.user?.role;
    const activeBranchId = session?.user?.activeBranch?._id;
    const userBranches = session?.user?.branches;

    useEffect(() => {
        let isMounted = true;

        const loadBranches = async () => {
            try {
                const res = await fetch("/api/branches/list");
                const data = await res.json();

                if (!isMounted) return;

                let availableBranches: Branch[] = [];

                if (userRole === "ADMINISTRATOR" || userRole === "ACCOUNTS_HEAD") {
                    availableBranches = data.branches || [];
                } else if (userRole === "AREA_MANAGER") {
                    availableBranches = userBranches || [];
                }

                setBranches(availableBranches);

                if (activeBranchId) {
                    setSelectedBranch(activeBranchId);
                } else if (availableBranches.length > 0) {
                    setSelectedBranch(availableBranches[0]._id);
                }
            } catch (error) {
                console.error("Failed to fetch branches:", error);
            }
        };

        loadBranches();

        return () => {
            isMounted = false;
        };
    }, [userRole, activeBranchId, userBranches]);

    /* ---------------- BRANCH SWITCH ---------------- */
    const handleBranchChange = async (branchId: string) => {
        setSelectedBranch(branchId);

        const selectedBranchObj = branches.find((b) => b._id === branchId);

        await update({
            user: {
                ...session?.user,
                activeBranch: selectedBranchObj ?? null,
            },
        });

        window.location.reload();
    };

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/" });
    };

    const canSwitchBranch =
        session?.user?.role === "ADMINISTRATOR" ||
        session?.user?.role === "ACCOUNTS_HEAD" ||
        session?.user?.role === "AREA_MANAGER";

    /* ---------------- NAVIGATION TABS DEFINITIONS ---------------- */
    const constantBaseTabs: TabItem[] = [
        {
            name: "Dashboard",
            path: isPersonal ? "/dashboard/personal" : "/dashboard",
            icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
            name: "Report",
            path: isPersonal ? "/dashboard/personal/report" : "/dashboard/report",
            icon: <BarChart3 className="w-4 h-4" />,
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
                : [
                    { name: "Report Hub", path: "/dashboard/report" },
                    { name: "Day Sheet", path: "/dashboard/report/day-sheet" },
                    { name: "Loan Report", path: "/dashboard/report/loan-report" },
                    { name: "Client Report", path: "/dashboard/report/client-report" },
                    { name: "Bill Report", path: "/dashboard/report/bill-report" },
                    { name: "Arrear Report", path: "/dashboard/report/arrear" },
                    { name: "Outstanding", path: "/dashboard/report/outstanding" },
                    { name: "Weekly Demand Sheet", path: "/dashboard/report/weekly-demand-sheet" },
                    { name: "Summary Report", path: "/dashboard/report/summary-report" },
                ],
        },
        {
            name: "Trial Balance",
            path: isPersonal ? "/dashboard/personal/trial-balance" : "/dashboard/trial-balance",
            icon: <Scale className="w-4 h-4" />,
        },
    ];

    const mfiTabs: TabItem[] = [
        { name: "Center", path: "/dashboard/group", icon: <MapPin className="w-4 h-4" /> },
        { name: "Customer", path: "/dashboard/client", icon: <Users className="w-4 h-4" /> },
        { name: "Loan", path: "/dashboard/fund", icon: <Wallet className="w-4 h-4" /> },
        { name: "Scheme", path: "/dashboard/scheme", icon: <Layers className="w-4 h-4" /> },
        { name: "Payment", path: "/dashboard/bill", icon: <Receipt className="w-4 h-4" /> },
    ];

    const personalTabs: TabItem[] = [
        { name: "Customer", path: "/dashboard/personal/client", icon: <Users className="w-4 h-4" /> },
        { name: "New Savings/Loan", path: "/dashboard/personal/fund", icon: <Wallet className="w-4 h-4" /> },
        { name: "Personal Loan", path: "/dashboard/personal/loans", icon: <Coins className="w-4 h-4" /> },
        { name: "Scheme", path: "/dashboard/personal/scheme", icon: <Layers className="w-4 h-4" /> },
        { name: "Payment / Deposit", path: "/dashboard/personal/bill", icon: <Receipt className="w-4 h-4" /> },
    ];

    const managerTabs: TabItem[] = [
        {
            name: "Income",
            path: isPersonal ? "/dashboard/personal/credit" : "/dashboard/credit",
            icon: <TrendingUp className="w-4 h-4" />,
        },
        {
            name: "Expenses",
            path: isPersonal ? "/dashboard/personal/debit" : "/dashboard/debit",
            icon: <TrendingDown className="w-4 h-4" />,
        },
    ];

    const adminTabs: TabItem[] = [
        {
            name: "Income",
            path: isPersonal ? "/dashboard/personal/credit" : "/dashboard/credit",
            icon: <TrendingUp className="w-4 h-4" />,
        },
        {
            name: "Expenses",
            path: isPersonal ? "/dashboard/personal/debit" : "/dashboard/debit",
            icon: <TrendingDown className="w-4 h-4" />,
        },
        {
            name: "Approval",
            path: isPersonal ? "/dashboard/personal/approval" : "/dashboard/approval",
            icon: <CheckSquare className="w-4 h-4" />,
        },
        ...(!isPersonal
            ? [
                {
                    name: "Branches",
                    path: "/dashboard/branches",
                    icon: <Building2 className="w-4 h-4" />,
                },
                {
                    name: "Staffs",
                    path: "/dashboard/employees",
                    icon: <Briefcase className="w-4 h-4" />,
                },
                ...(role === "ADMINISTRATOR"
                    ? [
                        {
                            name: "Staff Payroll",
                            path: "/dashboard/staff-salary",
                            icon: <Coins className="w-4 h-4" />,
                        },
                    ]
                    : []),
            ]
            : []),
    ];

    const currentModuleTabs = isPersonal ? personalTabs : mfiTabs;

    const roleTabs =
        role === "ADMINISTRATOR" || role === "ACCOUNTS_HEAD"
            ? adminTabs
            : role === "MANAGER" || role === "TELLER" || role === "AREA_MANAGER"
                ? managerTabs
                : [];

    const finalTabs: TabItem[] = [
        constantBaseTabs[0], // Dashboard
        ...currentModuleTabs,
        constantBaseTabs[1], // Report
        constantBaseTabs[2], // Trial Balance
        ...roleTabs,
    ];

    const handleNavigate = (path: string) => {
        router.push(path);
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 w-full print:hidden transition-colors duration-300 ${isPersonal
                ? "bg-[#241E4E] border-b border-[#7C5CFC]/30 shadow-md text-white"
                : "bg-white/95 backdrop-blur-xl border-b border-[#E8E7F0] shadow-xs text-slate-800"
                }`}
        >
            {/* ROW 1: BRAND LOGO + ACCOUNT & UTILITY CONTROLS (Height: h-16 / 64px) */}
            <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
                {/* Left: Mobile Toggle + Logo + Brand Title */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        aria-label="Toggle navigation menu"
                        className={`md:hidden p-2 rounded-xl transition-colors cursor-pointer ${isPersonal
                            ? "bg-[#2F2864] text-[#7C5CFC] hover:bg-[#383074]"
                            : "bg-slate-100 text-slate-700 hover:bg-[#EDE9FE] hover:text-[#7C5CFC]"
                            }`}
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div
                        onClick={() => router.push(isPersonal ? "/dashboard/personal" : "/dashboard")}
                        className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
                    >
                        <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-white/10 p-0.5 border border-[#7C5CFC]/30 shadow-2xs group-hover:scale-105 transition-transform">
                            <Image
                                src="/default/logo.png"
                                alt="Logo"
                                fill
                                sizes="32px"
                                priority
                                className="object-contain p-0.5"
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1
                                className={`text-sm md:text-base font-black tracking-tight truncate leading-tight ${isPersonal
                                    ? "text-white"
                                    : "bg-gradient-to-r from-[#1C1942] to-[#7C5CFC] bg-clip-text text-transparent"
                                    }`}
                            >
                                Sample Small Finance Pvt Ltd
                            </h1>
                            <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                                <span
                                    className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.2 rounded-full border ${isPersonal
                                        ? "bg-[#7C5CFC]/15 text-[#A78BFA] border-[#7C5CFC]/30"
                                        : "bg-[#EDE9FE] text-[#6846EB] border-[#DDD6FE]"
                                        }`}
                                >
                                    {isPersonal ? "Smart Savings" : "Microfinance (MFI)"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Module Switcher + Branch + Profile + Logout */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    {/* Employee Profile Button */}
                    {session?.user && (
                        <button
                            onClick={() => router.push("/dashboard/profile")}
                            title="View Employee Profile"
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-left shadow-2xs group cursor-pointer ${isPersonal
                                ? "bg-[#2F2864] hover:bg-[#383074] border border-[#7C5CFC]/30 text-purple-100"
                                : "bg-slate-100 hover:bg-[#EDE9FE] border border-slate-200 hover:border-[#DDD6FE] text-slate-800"
                                }`}
                        >
                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs bg-gradient-to-br from-[#7C5CFC] to-[#5835E5] text-white">
                                {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="hidden xl:flex flex-col min-w-0">
                                <span
                                    className={`text-[9px] uppercase font-bold tracking-wider leading-tight ${isPersonal ? "text-[#A78BFA]" : "text-slate-400 group-hover:text-[#7C5CFC]"
                                        }`}
                                >
                                    {role?.replace("_", " ") || "User"}
                                </span>
                                <span
                                    className={`text-xs font-bold truncate max-w-28 leading-tight ${isPersonal ? "text-white" : "text-slate-800"
                                        }`}
                                >
                                    {session.user.name}
                                </span>
                            </div>
                        </button>
                    )}

                    {/* Module Switcher (MFI Module active; savings module hidden) */}
                    <select
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer ${isPersonal
                            ? "border border-[#7C5CFC]/40 bg-[#2F2864] text-white focus:ring-2 focus:ring-[#7C5CFC]"
                            : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"
                            }`}
                        value={loanModule}
                        onChange={(e) => handleModuleChange(e.target.value)}
                    >
                        <option value="MFI" className={isPersonal ? "bg-[#241E4E] text-white font-medium" : "font-medium text-slate-800"}>
                            MFI Module
                        </option>
                    </select>

                    {/* Branch Selector */}
                    {session?.user &&
                        (canSwitchBranch ? (
                            <select
                                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold max-w-28 sm:max-w-40 shadow-2xs transition-all cursor-pointer ${isPersonal
                                    ? "border border-[#7C5CFC]/40 bg-[#2F2864] text-white focus:ring-2 focus:ring-[#7C5CFC]"
                                    : "border border-[#DDD6FE] bg-[#EDE9FE]/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] hover:bg-[#EDE9FE]"
                                    }`}
                                value={selectedBranch}
                                onChange={(e) => handleBranchChange(e.target.value)}
                            >
                                {branches.map((branch) => (
                                    <option
                                        key={branch._id}
                                        value={branch._id}
                                        className={isPersonal ? "bg-[#241E4E] text-white font-medium" : "font-medium text-slate-800"}
                                    >
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="hidden sm:flex items-center">
                                <span
                                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-2xs truncate max-w-32 ${isPersonal
                                        ? "bg-[#2F2864] border border-[#7C5CFC]/30 text-white"
                                        : "bg-slate-100 border border-slate-200 text-slate-800"
                                        }`}
                                >
                                    {session.user.branch?.name}
                                </span>
                            </div>
                        ))}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`group flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all duration-200 cursor-pointer ${isPersonal
                            ? "bg-[#1C173D] hover:bg-[#7C5CFC] text-[#7C5CFC] hover:text-white border border-[#7C5CFC]/40"
                            : "bg-[#26215B] hover:bg-[#1E1948] text-white border border-[#26215B]"
                            }`}
                    >
                        <span className="hidden sm:inline">Logout</span>
                        <svg
                            className="w-3.5 h-3.5 text-[#7C5CFC] group-hover:text-white transition-colors"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ROW 2: HORIZONTAL PEOPLEXIO PILL NAVIGATION BAR (Height: h-12 / 48px) */}
            <div
                className={`hidden md:flex items-center justify-between h-13 px-2 sm:px-4 border-t gap-1.5 sm:gap-2.5 ${isPersonal ? "border-[#7C5CFC]/20 bg-[#1C173D]/60" : "border-[#E8E7F0] bg-slate-50/70"
                    }`}
            >
                {/* Left Slide Arrow ("<") */}
                <button
                    type="button"
                    onClick={() => handleSlide("left")}
                    aria-label="Slide tabs left"
                    title="Slide left"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-90 ${isPersonal
                        ? "bg-[#241E4E] hover:bg-[#2F2864] text-purple-200 hover:text-white border border-[#7C5CFC]/40 hover:border-[#7C5CFC] hover:shadow-[#7C5CFC]/20"
                        : "bg-white hover:bg-[#EDE9FE] text-slate-700 hover:text-[#7C5CFC] border border-[#E8E7F0] hover:border-[#DDD6FE] hover:shadow-sm"
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Horizontal Navigation Pills (Scrollable Container) */}
                <nav
                    ref={navScrollRef}
                    className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth"
                >
                    {finalTabs.map((tab) => {
                        const hasSub = Boolean(tab.subItems && tab.subItems.length > 0);
                        const isCurrentTab =
                            pathname === tab.path ||
                            (pathname.startsWith(tab.path + "/") &&
                                tab.path !== "/dashboard" &&
                                tab.path !== "/dashboard/personal");
                        const active = isCurrentTab;
                        const isDropdownOpen = openDropdown === tab.name;

                        if (hasSub && tab.subItems) {
                            return (
                                <div
                                    key={tab.path}
                                    ref={(el) => {
                                        tabButtonRefs.current[tab.name] = el;
                                    }}
                                    className="relative shrink-0 flex items-center"
                                    data-active={active ? "true" : "false"}
                                    onMouseEnter={() => handleOpenDropdown(tab.name)}
                                    onMouseLeave={handleScheduleCloseDropdown}
                                >
                                    <div
                                        className={`flex items-center rounded-full text-xs font-bold transition-all whitespace-nowrap ${active
                                            ? isPersonal
                                                ? "bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30"
                                                : "bg-[#241E4E] text-white shadow-md shadow-[#241E4E]/20"
                                            : isPersonal
                                                ? "text-purple-200/85 hover:text-white hover:bg-[#2F2864]"
                                                : "text-slate-600 hover:text-[#1C1942] hover:bg-[#EDE9FE]"
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleNavigate(tab.path)}
                                            className="flex items-center gap-1.5 py-1.5 pl-3.5 pr-1.5 cursor-pointer"
                                            title={`Open ${tab.name} Page`}
                                        >
                                            <span className={active ? "text-white" : isPersonal ? "text-[#A78BFA]" : "text-slate-400"}>
                                                {tab.icon}
                                            </span>
                                            <span>{tab.name}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isDropdownOpen) {
                                                    setOpenDropdown(null);
                                                } else {
                                                    handleOpenDropdown(tab.name);
                                                }
                                            }}
                                            className="p-1.5 mr-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                            title={`Toggle ${tab.name} Menu`}
                                            aria-label={`Toggle ${tab.name} Menu`}
                                        >
                                            <ChevronDown
                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={tab.path}
                                type="button"
                                data-active={active ? "true" : "false"}
                                onClick={() => handleNavigate(tab.path)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${active
                                    ? isPersonal
                                        ? "bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30"
                                        : "bg-[#241E4E] text-white shadow-md shadow-[#241E4E]/20"
                                    : isPersonal
                                        ? "text-purple-200/85 hover:text-white hover:bg-[#2F2864]"
                                        : "text-slate-600 hover:text-[#1C1942] hover:bg-[#EDE9FE]"
                                    }`}
                            >
                                <span className={active ? "text-white" : isPersonal ? "text-[#A78BFA]" : "text-slate-400"}>
                                    {tab.icon}
                                </span>
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Right Slide Arrow (">") */}
                <button
                    type="button"
                    onClick={() => handleSlide("right")}
                    aria-label="Slide tabs right"
                    title="Slide right"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-90 ${isPersonal
                        ? "bg-[#241E4E] hover:bg-[#2F2864] text-purple-200 hover:text-white border border-[#7C5CFC]/40 hover:border-[#7C5CFC] hover:shadow-[#7C5CFC]/20"
                        : "bg-white hover:bg-[#EDE9FE] text-slate-700 hover:text-[#7C5CFC] border border-[#E8E7F0] hover:border-[#DDD6FE] hover:shadow-sm"
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Right: Cyrax Version Pill */}
                <div className="hidden xl:flex items-center gap-2 shrink-0 pl-3 border-l border-slate-200/50">
                    <button
                        onClick={() => window.open(CYRAX_URL, "_blank")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${isPersonal
                            ? "text-purple-300 hover:text-white hover:bg-[#2F2864]"
                            : "text-slate-500 hover:text-[#7C5CFC] hover:bg-[#EDE9FE]"
                            }`}
                    >
                        <Sparkles className="w-3 h-3 text-[#7C5CFC]" />
                        <span>Cyrax {VERSION}</span>
                    </button>
                </div>
            </div>

            {/* FLOATING DROPDOWN FOR SUB-ITEMS (Fixed position, never clipped by overflow-x) */}
            {openDropdown && (() => {
                const currentTab = finalTabs.find((t) => t.name === openDropdown);
                if (!currentTab?.subItems) return null;

                return (
                    <div
                        ref={floatingMenuRef}
                        style={{
                            position: "fixed",
                            top: `${dropdownCoords.top}px`,
                            left: `${dropdownCoords.left}px`,
                            zIndex: 100,
                        }}
                        onMouseEnter={handleCancelCloseDropdown}
                        onMouseLeave={handleScheduleCloseDropdown}
                        className={`min-w-64 max-h-[75vh] overflow-y-auto rounded-2xl p-2 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${isPersonal
                            ? "bg-[#241E4E] border-[#7C5CFC]/30 text-white shadow-[#1C173D]/80"
                            : "bg-white border-[#E8E7F0] text-slate-800 shadow-slate-400/30"
                            }`}
                    >
                        <div className="px-3 py-2 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#7C5CFC]">
                                {currentTab.name} Hub & Reports
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                                {currentTab.subItems.length} Reports
                            </span>
                        </div>
                        <div className="space-y-1 py-1">
                            {currentTab.subItems.map((sub) => {
                                const subActive = pathname === sub.path;
                                return (
                                    <button
                                        key={sub.path}
                                        type="button"
                                        onClick={() => handleNavigate(sub.path)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${subActive
                                            ? "bg-[#7C5CFC] text-white font-bold shadow-xs"
                                            : isPersonal
                                                ? "text-purple-100/90 hover:bg-[#2F2864] hover:text-white"
                                                : "text-slate-600 hover:bg-[#EDE9FE] hover:text-[#1C1942]"
                                            }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${subActive ? "bg-white" : "bg-[#7C5CFC]"
                                                }`}
                                        />
                                        <span className="truncate">{sub.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* MOBILE DRAWER / SLIDE-DOWN FOR SCREENS < MD */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-start">
                    <div
                        className={`w-full max-h-[85vh] overflow-y-auto p-4 shadow-2xl border-b transition-colors ${isPersonal
                            ? "bg-[#241E4E] border-[#7C5CFC]/30 text-white"
                            : "bg-white border-[#E8E7F0] text-slate-800"
                            }`}
                    >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/40">
                            <span className="text-xs font-black uppercase tracking-wider text-[#7C5CFC]">
                                Navigation Menu
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                                {isPersonal ? "Smart Savings" : "Microfinance"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                                        <div key={tab.path} className="col-span-full space-y-1 my-1">
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate(tab.path)}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${active
                                                    ? "bg-[#7C5CFC] text-white shadow-xs"
                                                    : isPersonal
                                                        ? "bg-[#2F2864] text-purple-100 hover:bg-[#383074]"
                                                        : "bg-slate-100 text-slate-800 hover:bg-[#EDE9FE]"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {tab.icon}
                                                    <span>{tab.name}</span>
                                                </div>
                                                <span className="text-[10px] font-semibold opacity-80">
                                                    Open Report Hub &rarr;
                                                </span>
                                            </button>
                                            <div className="grid grid-cols-2 gap-1 pl-3 pt-1 border-l-2 border-[#7C5CFC]/40 ml-2">
                                                {tab.subItems.map((sub) => {
                                                    const subActive = pathname === sub.path;
                                                    return (
                                                        <button
                                                            key={sub.path}
                                                            type="button"
                                                            onClick={() => handleNavigate(sub.path)}
                                                            className={`p-2 rounded-lg text-xs font-semibold text-left transition-all ${subActive
                                                                ? "bg-[#7C5CFC] text-white"
                                                                : isPersonal
                                                                    ? "text-purple-200 hover:bg-[#2F2864]"
                                                                    : "text-slate-600 hover:bg-[#EDE9FE]"
                                                                }`}
                                                        >
                                                            {sub.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={tab.path}
                                        type="button"
                                        onClick={() => handleNavigate(tab.path)}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-left transition-all ${active
                                            ? "bg-[#7C5CFC] text-white shadow-xs"
                                            : isPersonal
                                                ? "text-purple-100 hover:bg-[#2F2864]"
                                                : "text-slate-700 hover:bg-[#EDE9FE]"
                                            }`}
                                    >
                                        <span className={active ? "text-white" : "text-[#7C5CFC]"}>
                                            {tab.icon}
                                        </span>
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile Version Link */}
                        <div className="mt-4 pt-3 border-t border-slate-200/40 flex justify-between items-center text-xs">
                            <span className="text-slate-400">Sample Dashboard {VERSION}</span>
                            <button
                                onClick={() => window.open(CYRAX_URL, "_blank")}
                                className="text-[#7C5CFC] font-bold"
                            >
                                Powered by Cyrax
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
