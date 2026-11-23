"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
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
}

export default function RemittanceEntry() {
    const { data: session } = useSession();

    const [mode, setMode] = useState<"Cash" | "Bank">("Cash");
    const [targetBranchId, setTargetBranchId] = useState<string>("");
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchBranches = async () => {
            try {
                setLoadingBranches(true);
                const res = await fetch("/api/branches/list");

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();

                if (isMounted) {
                    // Extract branches array safely across different API response formats
                    let rawBranches: Branch[] = [];

                    if (Array.isArray(data)) {
                        rawBranches = data;
                    } else if (Array.isArray(data.branches)) {
                        rawBranches = data.branches;
                    } else if (Array.isArray(data.data)) {
                        rawBranches = data.data;
                    }

                    // Filter out invalid items missing _id or branchName
                    const validBranches = rawBranches.filter(
                        (b) => b && (b._id || (b as unknown as { id: string }).id) && b.name
                    ).map((b) => ({
                        _id: b._id || (b as unknown as { id: string }).id,
                        name: b.name,
                    }));

                    setBranches(validBranches);

                    if (validBranches.length === 0) {
                        toast.warning("No active branches found.");
                    }
                }
            } catch (err) {
                console.error("Error fetching branches:", err);
                toast.error("Failed to load branches from server.");
            } finally {
                if (isMounted) setLoadingBranches(false);
            }
        };

        fetchBranches();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (!session?.user) {
            toast.error("Not authenticated!");
            return;
        }

        if (!targetBranchId) {
            toast.error("Please select a target branch!");
            return;
        }

        const currentBranchId = session.user.branch?._id || session.user.branch;

        if (currentBranchId && currentBranchId === targetBranchId) {
            toast.error("Source and target branch cannot be the same!");
            return;
        }

        const remittanceData = {
            date: (form.elements.namedItem("date") as HTMLInputElement).value,
            fromBranch: currentBranchId,
            toBranch: targetBranchId,
            details: (form.elements.namedItem("details") as HTMLTextAreaElement).value,
            amount: Number((form.elements.namedItem("amount") as HTMLInputElement).value),
            mode,
            requestedBy: session.user.id,
        };

        try {
            const res = await fetch("/api/remittance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(remittanceData),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success("Remittance Request Sent Successfully!");
                form.reset();
                setTargetBranchId("");
                setMode("Cash");
            } else {
                toast.error(result.error || "Failed to send remittance request!");
            }
        } catch {
            toast.error("An error occurred while submitting.");
        }
    };

    return (
        <section className="max-w-7xl mx-auto space-y-8">
            <PageHeader />
            <h1 className="text-3xl font-bold text-amber-500">REMITTANCE REQUEST</h1>

            <Card className="p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label>Date :</Label>
                        <Input name="date" type="date" required />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Label>Transfer To Branch :</Label>
                        <Select
                            value={targetBranchId}
                            onValueChange={setTargetBranchId}
                            disabled={loadingBranches || branches.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        loadingBranches
                                            ? "Loading branches..."
                                            : branches.length === 0
                                                ? "No branches available"
                                                : "Select Branch"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((b) => (
                                    <SelectItem key={b._id} value={b._id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Transfer Details :</Label>
                        <Textarea name="details" rows={4} required placeholder="Reason / notes..." />
                    </div>

                    <div>
                        <Label>Mode :</Label>
                        <RadioGroup
                            value={mode}
                            onValueChange={(val: "Cash" | "Bank") => setMode(val)}
                            className="flex gap-6 items-center mt-2"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="Cash" id="cash" />
                                <Label htmlFor="cash">Cash</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="Bank" id="bank" />
                                <Label htmlFor="bank">Bank</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label>Amount :</Label>
                        <Input name="amount" type="number" required min={1} />
                    </div>

                    <div className="flex justify-center gap-6 pt-4">
                        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-10">
                            SEND REQUEST
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                                const form = e.currentTarget.form;
                                if (form) form.reset();
                                setTargetBranchId("");
                                setMode("Cash");
                            }}
                            className="px-10"
                        >
                            CLEAR
                        </Button>
                    </div>
                </form>
            </Card>
        </section>
    );
}