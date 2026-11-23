"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PageHeader() {
    const router = useRouter();
    const pathname = usePathname();

    const segments = pathname.split("/").filter(Boolean);
    const isPersonal = pathname.startsWith("/dashboard/personal");

    return (
        <div className={`flex items-center justify-between border-b pb-4 mb-6 print:hidden ${isPersonal ? "border-[#7C5CFC]/30" : "border-[#E8E7F0]"}`}>
            {/* Back Button */}
            <Button
                size="sm"
                className={`flex items-center gap-1.5 uppercase font-bold text-xs tracking-wider transition-all rounded-xl cursor-pointer ${
                    isPersonal
                        ? "bg-[#241E4E] hover:bg-[#2F2864] text-[#7C5CFC] border border-[#7C5CFC]/40 shadow-xs hover:shadow-[#7C5CFC]/15"
                        : "bg-[#26215B] hover:bg-[#1E1948] text-white border border-[#26215B] shadow-xs"
                }`}
                onClick={() => router.back()}
            >
                <ChevronLeft className={`h-4 w-4 ${isPersonal ? "text-[#7C5CFC]" : "text-white"}`} />
                BACK
            </Button>

            {/* Advanced Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-500">
                {segments.map((seg, index) => {
                    const path = "/" + segments.slice(0, index + 1).join("/");
                    const isLast = index === segments.length - 1;
                    const label = seg.charAt(0).toUpperCase() + seg.slice(1);

                    return (
                        <div key={path} className="flex items-center gap-2">
                            {!isLast ? (
                                <Link
                                    href={path}
                                    className={`transition-colors capitalize font-medium ${
                                        isPersonal ? "hover:text-[#7C5CFC] text-slate-600" : "hover:text-[#7C5CFC] text-slate-600"
                                    }`}
                                >
                                    {label}
                                </Link>
                            ) : (
                                <span className={`font-bold text-slate-900 underline underline-offset-4 decoration-2 capitalize ${
                                    isPersonal ? "decoration-[#7C5CFC]" : "decoration-[#7C5CFC]"
                                }`}>
                                    {label}
                                </span>
                            )}

                            {!isLast && (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                        </div>
                    );
                })}
            </nav>
        </div>
    );
}
