"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Credit } from "@/types/credit";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import CreditApprovalForm from "@/components/Credits/ApprovalForm";
import LoadingOverlay from "@/components/Loading";

export default function CreditApprovalPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [credit, setCredit] = useState<Credit | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCredit() {
            try {
                setLoading(true);

                const res = await fetch(`/api/credit/${id}`);

                if (!res.ok) {
                    throw new Error("Failed to fetch credit");
                }

                const data = await res.json();
                setCredit(data.credit);
            } catch (error) {
                console.log(error);
                toast.error("Unable to load credit details");
                router.push("/dashboard/approval/credit");
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchCredit();
    }, [id, router]);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* GLOBAL LOADING OVERLAY */}
            <LoadingOverlay show={loading} />

            {/* Error / Not Found State */}
            {!loading && !credit && (
                <div className="flex flex-col items-center justify-center pt-32 text-gray-500 space-y-4">
                    <AlertCircle className="w-16 h-16 text-gray-400 opacity-50" />
                    <p className="text-lg">Credit record not found.</p>
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="mt-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            )}

            {/* Main Form Content */}
            {!loading && credit && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="max-w-7xl mx-auto p-4 lg:p-8"
                >
                    <CreditApprovalForm credit={credit} />
                </motion.div>
            )}
        </div>
    );
}