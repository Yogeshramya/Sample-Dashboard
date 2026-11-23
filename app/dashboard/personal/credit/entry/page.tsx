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
import { ArrowLeft, PlusCircle } from "lucide-react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

export default function PersonalCreditEntry() {
    const { data: session } = useSession();
    const router = useRouter();

    const [mode, setMode] = useState<"Cash" | "Bank">("Cash");
    const [title, setTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [titles, setTitles] = useState<{ _id: string; title: string }[]>([]);
    const [loadingTitles, setLoadingTitles] = useState(true);

    useEffect(() => {
        const fetchTitles = async () => {
            try {
                setLoadingTitles(true);
                const res = await fetch("/api/personal/credit/title");
                const data = await res.json();
                if (data.success) {
                    setTitles(data.titles || []);
                } else {
                    toast.error("Failed to load savings income titles");
                }
            } catch {
                toast.error("Error loading titles");
            } finally {
                setLoadingTitles(false);
            }
        };

        fetchTitles();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (!session?.user) {
            toast.error("Not authenticated!");
            return;
        }

        const formData = new FormData(form);
        const date = formData.get("date") as string;
        const details = formData.get("details") as string;
        const amount = Number(formData.get("amount"));

        if (!date || !title || !details || isNaN(amount) || amount <= 0) {
            toast.error("Please fill all fields with valid data!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/personal/credit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    title,
                    details,
                    amount,
                    mode,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Savings income recorded successfully!");
                form.reset();
                setTitle("");
                setMode("Cash");
            } else {
                toast.error(data.error || "Failed to add income");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal/credit")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Smart Savings Income Entry
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Record a miscellaneous income entry exclusively for the Smart Savings ledger.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Date *</Label>
                            <Input
                                type="date"
                                name="date"
                                defaultValue={new Date().toISOString().split("T")[0]}
                                required
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Income Title *</Label>
                            <Select value={title} onValueChange={setTitle} required>
                                <SelectTrigger className="rounded-xl w-full">
                                    <SelectValue placeholder={loadingTitles ? "Loading..." : "Select Title"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {titles.map((t) => (
                                        <SelectItem key={t._id} value={t.title}>
                                            {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-slate-700">Details / Narration *</Label>
                        <Textarea
                            name="details"
                            placeholder="Enter specific details (e.g. New saver membership fees, duplicate passbook charge)"
                            rows={3}
                            required
                            className="rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-slate-700">Amount (₹) *</Label>
                            <Input
                                type="number"
                                name="amount"
                                placeholder="e.g. 500"
                                min="1"
                                step="any"
                                required
                                className="rounded-xl font-bold"
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
                                    <RadioGroupItem value="Cash" id="credit-cash" />
                                    <Label htmlFor="credit-cash" className="font-semibold cursor-pointer">Cash</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Bank" id="credit-bank" />
                                    <Label htmlFor="credit-bank" className="font-semibold cursor-pointer">Bank / Online</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/dashboard/personal/credit")}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-slate-900 text-amber-400 hover:bg-slate-800 font-bold rounded-xl gap-2 cursor-pointer shadow-md"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {submitting ? "Saving..." : "Record Savings Income"}
                        </Button>
                    </div>
                </form>
            </Card>
        </section>
    );
}

