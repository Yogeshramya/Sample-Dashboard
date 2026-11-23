"use client";

import Topbar from "@/components/Topbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen font-sans transition-colors duration-300 bg-[#f4f5fa] selection:bg-[#7c5cfc]/30 selection:text-[#26215b]">

            {/* 1. Fixed Topbar Navigation (Two-tier with Peoplexio Pill Tabs) */}
            <Topbar />

            {/* 2. Scrollable Full-Width Main Content Area */}
            <div className="pt-16 md:pt-[116px] flex flex-col min-h-screen">
                <main className="flex-1 p-4 md:p-6 lg:p-8 w-full relative z-0">

                    {/* Subtle ambient violet background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-[#7C5CFC]/8 rounded-full blur-[120px] pointer-events-none -z-10" />

                    <div className="max-w-[1680px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

        </div>
    );
}

