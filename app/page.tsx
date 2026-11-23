"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck,
  TrendingUp,
  Coins,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import LoadingOverlay from "@/components/Loading";

export default function Login() {
  const { data: session } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const savedModule = typeof window !== "undefined" ? localStorage.getItem("loanModule") : null;
      window.location.href = savedModule === "PERSONAL" ? "/dashboard/personal" : "/dashboard";
    }
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.error === "No user found") {
      toast.error("No account found with this username");
    } else if (res?.error === "Invalid password") {
      toast.error("Incorrect password");
    } else if (res?.error === "ROLE_MISMATCH") {
      toast.error("Access denied for this role");
    } else if (res?.ok) {
      toast.success("Login successful");
      const savedModule = typeof window !== "undefined" ? localStorage.getItem("loanModule") : null;
      window.location.href = savedModule === "PERSONAL" ? "/dashboard/personal" : "/dashboard";
    } else {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5FA] flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#7C5CFC]/30 selection:text-[#241E4E]">
      <LoadingOverlay show={loading} />

      {/* Ambient background glows matching dashboard */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#7C5CFC]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#241E4E]/8 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 z-10 w-full max-w-6xl mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-[#E8E7F0] shadow-2xl shadow-[#241E4E]/6 overflow-hidden">

          {/* Left Column: Brand Hero Panel (Midnight Violet) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1C173D] via-[#241E4E] to-[#2F2864] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#7C5CFC]/20">
            {/* Background Decorative Rings / Glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#7C5CFC]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-[#5835E5]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand Identity */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 border border-[#7C5CFC]/40 shadow-inner">
                  <Image
                    src="/default/cyrax.png"
                    alt="Logo"
                    fill
                    sizes="48px"
                    priority
                    className="object-contain p-0.5"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                    Sample Small Finance
                  </h2>
                  <p className="text-[11px] font-bold text-[#A78BFA] tracking-wider uppercase">
                    Pvt Ltd
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-3 leading-snug">
                  Smart Banking &amp; Financial Management
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed mt-2 font-normal">
                  Secure multi-branch platform for Microfinance (MFI) operations and administration.
                </p>
              </div>
            </div>

            {/* Middle Feature Highlights */}
            <div className="my-8 space-y-3 relative z-10 hidden sm:block">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] flex items-center justify-center shrink-0 border border-[#7C5CFC]/30">
                  <TrendingUp className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Microfinance &amp; Personal Loans</p>
                  <p className="text-[11px] text-purple-200/70">Complete lifecycle: KYC, verification, approval, disbursement &amp; recoveries.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] flex items-center justify-center shrink-0 border border-[#7C5CFC]/30">
                  <ShieldCheck className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Bank-Grade Audit Security</p>
                  <p className="text-[11px] text-purple-200/70">Role-based access, branch isolation, and automated trial balance reconciliations.</p>
                </div>
              </div>
            </div>

            {/* Bottom Security Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-300/80 relative z-10">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7C5CFC]" />
                256-Bit SSL Encrypted
              </span>
              <span className="font-mono text-purple-300/60">v2.003</span>
            </div>
          </div>

          {/* Right Column: Clean Login Form */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-8">

              {/* Form Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#7C5CFC] border border-[#DDD6FE]">
                  <span className="w-2 h-2 rounded-full bg-[#7C5CFC] animate-pulse" />
                  Staff &amp; Admin Sign In
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#1C1942] tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed">
                  Enter your assigned credentials to access your branch dashboard.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1C1942]">
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-[#7C5CFC]" />
                    </div>
                    <Input
                      type="text"
                      placeholder="e.g. admin or employee ID"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-[#F4F5FA] border-[#E8E7F0] text-slate-900 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:border-transparent transition-all placeholder:text-slate-400 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1C1942]">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-[#7C5CFC]" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-xl bg-[#F4F5FA] border-[#E8E7F0] text-slate-900 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:border-transparent transition-all placeholder:text-slate-400 shadow-2xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#7C5CFC] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7C5CFC] via-[#6846EB] to-[#5835E5] hover:from-[#6846EB] hover:to-[#5835E5] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#7C5CFC]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#7C5CFC]/30 active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In to Dashboard
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Page Bottom Simple Copyright */}
      <footer className="py-4 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} Sample Small Finance Pvt Ltd &bull; All Rights Reserved.
      </footer>
    </div>
  );
}
