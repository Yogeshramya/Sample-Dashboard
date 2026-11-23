"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ArrowLeft, ArrowRightLeft, Landmark, Layers } from "lucide-react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

interface Branch {
    _id: string;
    name: string;
    code?: string;
}

export default function PersonalRemittanceEntry() {
    const { data: session } = useSession();
    const router = useRouter();

    const [transferType, setTransferType] = useState<"INTER_BRANCH" | "INTER_MODULE">("INTER_BRANCH");
    const [fromModule, setFromModule] = useState<"MFI" | "PERSONAL">("PERSONAL");
    const [toModule, setToModule] = useState<"MFI" | "PERSONAL">("PERSONAL");
    const [targetBranchId, setTargetBranchId] = useState("");
    const [mode, setMode] = useState<"Cash" | "Bank">("Cash");
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const currentBranchId = session?.user?.activeBranch?._id || session?.user?.branch?._id;
    const currentBranchName = session?.user?.activeBranch?.name || session?.user?.branch?.name || "Current Branch";

    useEffect(() => {
        fetch("/api/branches/list")
            .then((r) => r.json())
            .then((data) => {
                if (data.branches) setBranches(data.branches);
            })
            .catch(() => toast.error("Failed to load branches"))
            .finally(() => setLoadingBranches(false));
    }, []);

    // When switching to INTER_MODULE, default target branch to current branch
    const handleTypeChange = (type: "INTER_BRANCH" | "INTER_MODULE") => {
        setTransferType(type);
        if (type === "INTER_MODULE") {
            setFromModule("MFI");
            setToModule("PERSONAL");
            if (currentBranchId) setTargetBranchId(currentBranchId);
        } else {
            setFromModule("PERSONAL");
            setToModule("PERSONAL");
            setTargetBranchId("");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;

        const formData = new FormData(form);
        const amount = Number(formData.get("amount"));
        const details = formData.get("details") as string;

        if (!targetBranchId) return toast.error("Please select destination branch");
        if (!amount || amount <= 0) return toast.error("Enter a valid amount");
        if (!details || !details.trim()) return toast.error("Please enter transfer details");

        setSubmitting(true);
        try {
            const res = await fetch("/api/personal/remittance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toBranchId: targetBranchId,
                    amount,
                    mode,
                    details,
                    remittanceType: transferType,
                    fromModule,
                    toModule,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Remittance dispatched! Awaiting destination approval.");
                router.push("/dashboard/personal/remittance/report");
            } else {
                toast.error(data.error || "Failed to submit remittance");
            }
        } catch {
            toast.error("Network error while submitting remittance");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <ArrowRightLeft className="w-7 h-7 text-amber-500" />
                        Remittance Entry (Smart Savings)
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">
                        Dispatch inter-branch funds or transfer vault liquidity between MFI and Smart Savings.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/personal/remittance")}
                    className="flex items-center gap-2 rounded-xl text-xs font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Remittances
                </Button>
            </div>

            <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-6">
                {/* Transfer Type Selection Tabs */}
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Select Remittance Type
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                            onClick={() => handleTypeChange("INTER_BRANCH")}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                                transferType === "INTER_BRANCH"
                                    ? "border-amber-500 bg-amber-50/50"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                        >
                            <div className="p-2 rounded-xl bg-slate-900 text-amber-400">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">Inter-Branch Transfer</h4>
                                <p className="text-2xs text-slate-500">Transfer Smart Savings funds to another branch</p>
                            </div>
                        </div>

                        <div
                            onClick={() => handleTypeChange("INTER_MODULE")}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                                transferType === "INTER_MODULE"
                                    ? "border-amber-500 bg-amber-50/50"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                        >
                            <div className="p-2 rounded-xl bg-slate-900 text-amber-400">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">Inter-Module Transfer</h4>
                                <p className="text-2xs text-slate-500">Transfer vault cash between MFI and Smart Savings</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pt-2 border-t border-slate-100">
                    {/* Inter-Module Direction Configuration */}
                    {transferType === "INTER_MODULE" && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-slate-600">Source Vault</Label>
                                <Select
                                    value={fromModule}
                                    onValueChange={(val) => {
                                        setFromModule(val as "MFI" | "PERSONAL");
                                        setToModule(val === "MFI" ? "PERSONAL" : "MFI");
                                    }}
                                >
                                    <SelectTrigger className="rounded-xl w-full bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MFI">MFI Microfinance Vault</SelectItem>
                                        <SelectItem value="PERSONAL">Smart Savings Vault</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-slate-600">Destination Vault</Label>
                                <div className="h-10 px-3 flex items-center bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900">
                                    {toModule === "PERSONAL" ? "Smart Savings Vault" : "MFI Microfinance Vault"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Source Branch</Label>
                            <Input
                                value={currentBranchName}
                                disabled
                                className="rounded-xl bg-slate-50 font-semibold text-slate-700"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Destination Branch *</Label>
                            <Select value={targetBranchId} onValueChange={setTargetBranchId} required>
                                <SelectTrigger className="rounded-xl w-full">
                                    <SelectValue placeholder={loadingBranches ? "Loading..." : "Select Destination Branch"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b._id} value={b._id}>
                                            {b.name} {b.code ? `(${b.code})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Transfer Amount (₹) *</Label>
                            <Input
                                type="number"
                                name="amount"
                                placeholder="e.g. 50000"
                                min="1"
                                required
                                className="rounded-xl font-black text-base"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Payment Mode</Label>
                            <RadioGroup
                                value={mode}
                                onValueChange={(val) => setMode(val as "Cash" | "Bank")}
                                className="flex gap-4 pt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Cash" id="remit-cash" />
                                    <Label htmlFor="remit-cash" className="font-semibold cursor-pointer">Physical Cash</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Bank" id="remit-bank" />
                                    <Label htmlFor="remit-bank" className="font-semibold cursor-pointer">Bank Transfer / NEFT</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-slate-700">Transfer Purpose / Details *</Label>
                        <Textarea
                            name="details"
                            placeholder="Enter description (e.g. Weekly collection remittance, Smart savings liquidity top-up)"
                            rows={3}
                            required
                            className="rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/dashboard/personal/remittance")}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-slate-900 text-amber-400 hover:bg-slate-800 font-bold rounded-xl gap-2 cursor-pointer shadow-md"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            {submitting ? "Sending..." : "Dispatch Remittance"}
                        </Button>
                    </div>
                </form>
            </Card>
        </section>
    );
}
