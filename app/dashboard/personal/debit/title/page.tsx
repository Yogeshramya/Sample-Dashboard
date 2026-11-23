"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface TitleItem {
    _id: string;
    title: string;
}

export default function PersonalDebitTitles() {
    const router = useRouter();
    const [titles, setTitles] = useState<TitleItem[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(false);

    const loadTitles = async () => {
        try {
            const res = await fetch("/api/personal/debit/title");
            const data = await res.json();
            if (data.success) setTitles(data.titles || []);
        } catch {
            toast.error("Failed to load titles");
        }
    };

    useEffect(() => {
        loadTitles();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return toast.error("Enter a title name");

        setLoading(true);
        try {
            const res = await fetch("/api/personal/debit/title", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Expense category created!");
                setNewTitle("");
                loadTitles();
            } else {
                toast.error(data.error || "Failed to create category");
            }
        } catch {
            toast.error("Error creating category");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"?`)) return;

        try {
            const res = await fetch(`/api/personal/debit/title/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Category deleted");
                loadTitles();
            } else {
                toast.error(data.error || "Failed to delete");
            }
        } catch {
            toast.error("Error deleting category");
        }
    };

    return (
        <section className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader />

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/personal/debit")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Smart Savings Expense Categories
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Configure dedicated expense heads for the Smart Savings ledger.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Card */}
            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
                <form onSubmit={handleAdd} className="flex gap-3">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Saver Passbook Printing, Area Collection Conveyance, Office Stationery"
                        className="rounded-xl flex-1 text-sm"
                    />
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 text-amber-400 font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Plus className="w-4 h-4" /> Add Category
                    </Button>
                </form>
            </Card>

            {/* Titles List */}
            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    Existing Savings Expense Heads ({titles.length})
                </h3>
                {titles.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No categories created yet.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {titles.map((t) => (
                            <div key={t._id} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-lg">
                                <span className="font-semibold text-slate-800 text-sm">{t.title}</span>
                                <button
                                    onClick={() => handleDelete(t._id, t.title)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </section>
    );
}

