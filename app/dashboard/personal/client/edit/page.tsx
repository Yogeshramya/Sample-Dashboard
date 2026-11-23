"use client";

import { useState, useEffect } from "react";
import { Save, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/Loading";
import { PersonalClient } from "@/types/personal";

export default function EditPersonalClientPage() {
    const [clients, setClients] = useState<PersonalClient[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        mobile: "",
        address: "",
        occupation: "",
        panNumber: "",
        guarantorName: "",
        guarantorMobile: "",
        guarantorRelation: "",
    });

    useEffect(() => {
        async function loadClients() {
            try {
                const res = await fetch("/api/personal/clients");
                const data = await res.json();
                if (data.success) {
                    setClients(data.clients || []);
                }
            } catch {
                toast.error("Failed to fetch clients");
            }
        }
        loadClients();
    }, []);

    const handleSelectClient = (c: PersonalClient) => {
        setSelectedId(c._id);
        setForm({
            fullName: c.fullName || "",
            mobile: c.mobile || "",
            address: c.address || "",
            occupation: c.occupation || "",
            panNumber: c.panNumber || "",
            guarantorName: c.guarantorName || "",
            guarantorMobile: c.guarantorMobile || "",
            guarantorRelation: c.guarantorRelation || "",
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return toast.error("Select a client first");

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/clients/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Customer updated successfully");
                // Refresh list
                const refreshed = clients.map((c) => (c._id === selectedId ? { ...c, ...form } : c));
                setClients(refreshed);
            } else {
                toast.error(data.message || "Failed to update");
            }
        } catch {
            toast.error("Network error while updating");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (!confirm("Are you sure you want to delete this customer?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/personal/clients/${selectedId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Customer removed");
                setClients(clients.filter((c) => c._id !== selectedId));
                setSelectedId("");
            } else {
                toast.error(data.message || "Failed to delete");
            }
        } catch {
            toast.error("Error deleting customer");
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.fullName.toLowerCase().includes(q) ||
            c.clientId.toLowerCase().includes(q) ||
            c.mobile.includes(q)
        );
    });

    return (
        <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <LoadingOverlay show={loading} />
            <PageHeader />

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Edit className="w-8 h-8 text-amber-500" />
                    Modify Customer Details
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                    Select a customer to edit their profile information or remove the record.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client List Selector */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 md:col-span-1 shadow-xs h-fit max-h-150 overflow-y-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Filter customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs rounded-xl"
                        />
                    </div>

                    <div className="space-y-1">
                        {filteredClients.map((c) => (
                            <button
                                key={c._id}
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedId === c._id
                                        ? "bg-slate-900 text-amber-400 font-bold shadow-xs"
                                        : "hover:bg-slate-100 text-slate-700"
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-mono">{c.clientId}</span>
                                    <span className="text-[10px] opacity-75">{c.mobile}</span>
                                </div>
                                <p className="text-sm font-bold truncate mt-0.5">{c.fullName}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Edit Form */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 md:col-span-2 shadow-xs">
                    {selectedId ? (
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-bold text-base text-slate-900">Editing Profile Information</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleDelete}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Record
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-600 uppercase">Full Name</label>
                                    <Input
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-600 uppercase">Mobile Number</label>
                                    <Input
                                        value={form.mobile}
                                        onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                                        required
                                        maxLength={10}
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-600 uppercase">Occupation</label>
                                    <Input
                                        value={form.occupation}
                                        onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-600 uppercase">PAN Number</label>
                                    <Input
                                        value={form.panNumber}
                                        onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                                        className="rounded-xl font-mono uppercase"
                                    />
                                </div>

                                <div className="col-span-2 space-y-1">
                                    <label className="font-bold text-slate-600 uppercase">Address</label>
                                    <Input
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="col-span-2 pt-2 border-t">
                                    <p className="font-bold text-slate-800 text-sm mb-3">Nominee Information</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-600 uppercase">Nominee Name</label>
                                            <Input
                                                value={form.guarantorName}
                                                onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-600 uppercase">Relation</label>
                                            <Input
                                                value={form.guarantorRelation}
                                                onChange={(e) => setForm({ ...form, guarantorRelation: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-600 uppercase">Nominee Phone</label>
                                            <Input
                                                value={form.guarantorMobile}
                                                onChange={(e) => setForm({ ...form, guarantorMobile: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl px-6"
                                >
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="py-24 text-center text-slate-400 font-medium">
                            Select a customer from the left to view and edit details.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

