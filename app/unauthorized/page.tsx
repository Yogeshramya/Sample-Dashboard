"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <ShieldAlert className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Access Restricted
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        You do not have administrative permission to view this section. If you believe this is an error, please contact your system administrator.
                    </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        asChild
                        variant="default"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2 shadow-sm"
                    >
                        <Link href="/dashboard">
                            <Home className="w-4 h-4" />
                            <span>Go to Dashboard</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold gap-2"
                    >
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Login Screen</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

