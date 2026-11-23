"use client";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
    Printer,
    Download,
    FileText,
    ExternalLink,
    CheckCircle2,
} from "lucide-react";

export default function FRTPage() {
    const pdfUrl = "/print/FRT.pdf";

    const handlePrint = () => {
        const printWindow = window.open(pdfUrl, "_blank");

        if (printWindow) {
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };
        }
    };

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = "FRT-Member-Enrollment-Form.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* ===== Page Header ===== */}
            <PageHeader />

            {/* ===== Main Card Container ===== */}
            <div className="relative max-w-2xl mx-auto">
                {/* Decorative Ambient Backdrop Glow */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

                <Card className="rounded-3xl border border-amber-500/20 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-950/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5">
                    {/* Top Decorative Border Accent */}
                    <div className="h-1.5 w-full bg-linear-to-r from-slate-900 via-amber-500 to-blue-950" />

                    <CardContent className="flex flex-col items-center text-center p-6 md:p-10 space-y-6">

                        {/* Document Icon Container */}
                        <div className="relative group">
                            <div className="p-5 bg-linear-to-br from-slate-900 to-blue-950 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <FileText className="w-10 h-10 text-amber-400" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2 max-w-md">
                            <h1 className="text-2xl md:text-3xl font-black bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 bg-clip-text text-transparent">
                                FRT – Member Enrollment Form
                            </h1>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Access the standardized physical enrollment template for field customer onboarding and official verification records.
                            </p>
                        </div>

                        {/* Highlights Strip */}
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-xs font-medium text-slate-700">Pre-formatted A4 Layout</span>
                            </div>
                            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-xs font-medium text-slate-700">Includes KYC Fields</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-4">
                            {/* Primary Action - Print / Preview */}
                            <Button
                                onClick={handlePrint}
                                size="lg"
                                className="w-full flex-1 flex items-center justify-center gap-2.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border border-amber-600/40 shadow-md hover:shadow-lg hover:shadow-amber-500/20 transition-all rounded-xl cursor-pointer"
                            >
                                <Printer className="w-4 h-4 text-slate-950" />
                                Print FRT Form
                            </Button>

                            {/* Secondary Action - Direct Download */}
                            <Button
                                onClick={handleDownload}
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-700 font-semibold rounded-xl cursor-pointer transition-all"
                            >
                                <Download className="w-4 h-4 text-slate-600" />
                                Download PDF
                            </Button>
                        </div>

                        {/* Direct PDF Link */}
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 transition-colors pt-1"
                        >
                            <span>Open raw PDF in new window</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}