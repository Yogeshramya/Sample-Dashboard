"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeProfileRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const router = useRouter();
    const resolvedParams = use(params);

    useEffect(() => {
        if (resolvedParams?.id) {
            router.replace(`/dashboard/profile?id=${encodeURIComponent(resolvedParams.id)}`);
        } else {
            router.replace("/dashboard/profile");
        }
    }, [resolvedParams, router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-sm font-semibold text-slate-500 animate-pulse">
                Redirecting to employee profile...
            </p>
        </div>
    );
}
