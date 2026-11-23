"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalaryRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/staff-salary");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
                <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-600">
                    Redirecting to Staff Payroll...
                </p>
            </div>
        </div>
    );
}

