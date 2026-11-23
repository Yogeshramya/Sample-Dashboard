"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    const handleNavigation = () => {
        // Safely check localStorage only when the button is clicked
        const storedModule = typeof window !== "undefined" ? localStorage.getItem("loanModule") : null;

        if (storedModule === "PERSONAL") {
            router.push("/dashboard/personal");
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Visual 404 Element */}
                <div className="relative">
                    <h1 className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 drop-shadow-sm tracking-tight">
                        404
                    </h1>
                    <span aria-hidden="true" className="absolute -inset-1 bg-blue-100 blur-2xl opacity-30 -z-10 rounded-full" />
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                        Oops! Page not found
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                        The page you are looking for doesn&apos;t exist, has been moved, or you don&apos;t have access to it.
                    </p>
                </div>

                {/* Call to Action */}
                <div className="pt-4">
                    <Button
                        onClick={handleNavigation}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 mx-auto"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}