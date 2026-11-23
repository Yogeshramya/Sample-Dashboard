"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Branch } from "@/types/next-auth";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const isPersonal = pathname.startsWith("/dashboard/personal");
    const { data: session, update } = useSession();

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState("");

    // Read initial module from localStorage lazily to avoid setting state in useEffect
    const [loanModule, setLoanModule] = useState<"MFI" | "PERSONAL">(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("loanModule");
            if (stored === "MFI" || stored === "PERSONAL") {
                return stored;
            }
        }
        return "MFI";
    });

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/" });
    };

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

    /* ---------------- KEEP MODULE SYNCED ACROSS TABS/SIDEBAR ---------------- */
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

    const canSwitchBranch =
        session?.user?.role === "ADMINISTRATOR" ||
        session?.user?.role === "ACCOUNTS_HEAD" ||
        session?.user?.role === "AREA_MANAGER";

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 h-16 w-full flex items-center justify-between px-4 md:px-6 print:hidden transition-colors duration-300 ${isPersonal ? "bg-[#241E4E] border-b border-[#7C5CFC]/30 shadow-md text-white" : "bg-white/95 backdrop-blur-xl border-b border-[#E8E7F0] text-slate-800"}`}>
            {/* Left - Branding */}
            <div className="flex items-center space-x-3">
                <div className="relative w-8 h-8 md:w-10 overflow-hidden">
                    <Image
                        src="/default/logo.png"
                        alt="Logo"
                        fill
                        sizes="36px"
                        loading="eager"
                        className="object-cover p-0.5"
                    />
                </div>
                <h1 className={`text-sm sm:text-base md:text-xl font-black whitespace-nowrap ${isPersonal ? "text-white" : "bg-gradient-to-r from-[#1C1942] to-[#7C5CFC] bg-clip-text text-transparent"}`}>
                    Sample Small Finance Pvt Ltd
                </h1>
            </div>

            {/* Right - User Controls */}
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Employee Profile Button */}
                {session?.user && (
                    <button
                        onClick={() => router.push("/dashboard/profile")}
                        title="View Employee Profile"
                        className={`flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl transition-all text-left shadow-2xs group cursor-pointer ${isPersonal ? "bg-[#2F2864] hover:bg-[#383074] border border-[#7C5CFC]/30 text-purple-100" : "bg-slate-100 hover:bg-[#EDE9FE] border border-slate-200 hover:border-[#DDD6FE] text-slate-800"}`}
                    >
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs bg-gradient-to-br from-[#7C5CFC] to-[#5835E5] text-white">
                            {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="hidden lg:flex flex-col min-w-0">
                            <span className={`text-[10px] uppercase font-bold tracking-wider leading-tight ${isPersonal ? "text-[#A78BFA]" : "text-slate-400 group-hover:text-[#7C5CFC]"}`}>
                                Profile
                            </span>
                            <span className={`text-xs font-bold truncate max-w-28 leading-tight ${isPersonal ? "text-white" : "text-slate-800"}`}>
                                {session.user.name}
                            </span>
                        </div>
                    </button>
                )}

                {/* Module Switcher (MFI vs Personal Smart Savings) */}
                <select
                    className={`rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-bold max-w-30 md:max-w-none shadow-sm transition-all cursor-pointer ${isPersonal ? "border border-[#7C5CFC]/40 bg-[#2F2864] text-white focus:ring-2 focus:ring-[#7C5CFC]" : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]"}`}
                    value={loanModule}
                    onChange={(e) => handleModuleChange(e.target.value)}
                >
                    <option value="MFI" className={isPersonal ? "bg-[#241E4E] text-white font-medium" : "font-medium text-slate-800"}>
                        MFI Module
                    </option>
                </select>

                {/* Branch Section */}
                {session?.user &&
                    (canSwitchBranch ? (
                        <select
                            className={`rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-semibold max-w-30 md:max-w-none shadow-sm transition-all cursor-pointer ${isPersonal ? "border border-[#7C5CFC]/40 bg-[#2F2864] text-white focus:ring-2 focus:ring-[#7C5CFC]" : "border border-[#DDD6FE] bg-[#EDE9FE]/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] hover:bg-[#EDE9FE]"}`}
                            value={selectedBranch}
                            onChange={(e) => handleBranchChange(e.target.value)}
                        >
                            {branches.map((branch) => (
                                <option key={branch._id} value={branch._id} className={isPersonal ? "bg-[#241E4E] text-white font-medium" : "font-medium text-slate-800"}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center">
                            <span className={`text-xs md:text-sm font-bold px-3 py-1.5 md:py-2 rounded-xl shadow-sm truncate max-w-30 md:max-w-none ${isPersonal ? "bg-[#2F2864] border border-[#7C5CFC]/30 text-white" : "bg-slate-100 border border-slate-200 text-slate-800"}`}>
                                {session.user.branch?.name}
                            </span>
                        </div>
                    ))}

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className={`group flex items-center gap-2 font-bold text-xs md:text-sm px-3 md:px-5 py-1.5 md:py-2 rounded-xl shadow-md transition-all duration-200 cursor-pointer ${isPersonal ? "bg-[#1C173D] hover:bg-[#7C5CFC] text-[#7C5CFC] hover:text-white border border-[#7C5CFC]/40 hover:shadow-[#7C5CFC]/20" : "bg-[#26215B] hover:bg-[#1E1948] text-white border border-[#26215B] hover:shadow-[#7C5CFC]/15"}`}
                >
                    <span className="hidden sm:inline">Logout</span>
                    <svg
                        className="w-4 h-4 text-[#7C5CFC] group-hover:text-white transition-colors"
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
        </header>
    );
}
