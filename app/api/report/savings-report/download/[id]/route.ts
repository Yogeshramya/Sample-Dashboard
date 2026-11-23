import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

import Loan from "@/models/Loan";
import Client from "@/models/Client";
import Group from "@/models/Group";
import Scheme from "@/models/Scheme";
import User from "@/models/User";
import Branch from "@/models/Branch";
import SavingsDraft from "@/models/SavingsDraft";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await params;

        // Find loan by loan ID, or fallback by customer ID
        let loan = await Loan.findById(id).populate([
            { path: "customer", model: Client },
            { path: "group", model: Group },
            { path: "scheme", model: Scheme },
            { path: "employee", model: User },
            { path: "branch", model: Branch },
        ]);

        if (!loan) {
            loan = await Loan.findOne({ customer: id })
                .sort({ updatedAt: -1 })
                .populate([
                    { path: "customer", model: Client },
                    { path: "group", model: Group },
                    { path: "scheme", model: Scheme },
                    { path: "employee", model: User },
                    { path: "branch", model: Branch },
                ]);
        }

        if (!loan) {
            return NextResponse.json(
                { error: "Savings refund record not found" },
                { status: 404 }
            );
        }

        // Branch authorization check
        if (!ctx.isAdmin && loan.branch && String(loan.branch._id || loan.branch) !== ctx.branchId) {
            return NextResponse.json(
                { error: "Unauthorized access to another branch's record" },
                { status: 403 }
            );
        }

        // Calculate total savings refunded
        let totalSavings = 0;
        if (loan.dues && Array.isArray(loan.dues)) {
            totalSavings = loan.dues.reduce((sum: number, d: { paid?: boolean; savings?: number }) => {
                return sum + (d.paid ? Number(d.savings || 0) : 0);
            }, 0);
        }

        if (totalSavings === 0) {
            const custId = loan.customer?._id || loan.customer;
            if (custId) {
                const draft = await SavingsDraft.findOne({ customerId: custId }).lean();
                if (draft?.totalSavings) {
                    totalSavings = Number(draft.totalSavings);
                }
            }
        }

        const dateStr = loan.updatedAt
            ? new Date(loan.updatedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            })
            : new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

        const templatePath = path.join(process.cwd(), "public", "print", "savings-form.pdf");
        let pdfBytes: Uint8Array;

        if (fs.existsSync(templatePath)) {
            const templateBytes = fs.readFileSync(templatePath);
            const pdfDoc = await PDFDocument.load(templateBytes);
            const page = pdfDoc.getPages()[0];
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Sub-header bar
            page.drawText(String(loan.branch?.name || "-"), { x: 120, y: 678, size: 9, font: fontBold });
            const groupText = loan.group?.groupName
                ? `${loan.group.groupName} ${loan.group.groupId ? `(${loan.group.groupId})` : ""}`
                : "-";
            page.drawText(groupText, { x: 285, y: 678, size: 9, font: fontBold });
            page.drawText(dateStr, { x: 440, y: 678, size: 9, font: fontBold });

            // Section 1: Member Details
            page.drawText(String(loan.customer?.name || "-"), { x: 185, y: 605, size: 9, font: fontBold });
            page.drawText(String(loan.customer?.customerCode || "-"), { x: 240, y: 578, size: 9, font: fontBold });

            const nomineeText = loan.customer?.nominee?.name
                ? `${loan.customer.nominee.name} ${loan.customer.nominee.relation ? `(${loan.customer.nominee.relation})` : ""}`
                : "-";
            page.drawText(nomineeText, { x: 208, y: 551, size: 9, font });
            page.drawText(String(loan.customer?.phone || "-"), { x: 95, y: 524, size: 9, font });
            page.drawText(String(loan.mfLoanId || "-"), { x: 100, y: 497, size: 9, font: fontBold });

            const loanAmtStr = loan.loanAmount ? `Rs. ${loan.loanAmount.toLocaleString("en-IN")}/-` : "-";
            page.drawText(loanAmtStr, { x: 110, y: 470, size: 9, font });

            // Section 2: Refund Details
            const formattedTotalSavings = `Rs. ${totalSavings.toLocaleString("en-IN")}/-`;
            page.drawText(formattedTotalSavings, { x: 200, y: 425, size: 9, font: fontBold });
            page.drawText("Rs. 0/-", { x: 205, y: 398, size: 9, font });
            page.drawText(formattedTotalSavings, { x: 250, y: 371, size: 9, font: fontBold });
            page.drawText("[ X ]", { x: 142, y: 344, size: 8, font: fontBold }); // Cash tick

            // Section 4 / Bottom Summary
            page.drawText(formattedTotalSavings, { x: 290, y: 99, size: 9.5, font: fontBold, color: rgb(0, 0.45, 0) });
            page.drawText(String(loan.employee?.name || "-"), { x: 205, y: 72, size: 9, font });
            page.drawText(dateStr, { x: 170, y: 45, size: 9, font });

            // Member Photo embedding (if available)
            const photoUrl = loan.customer?.memberPhoto;
            if (photoUrl) {
                try {
                    const imgBytes = await fetchImageBytes(photoUrl);
                    const isPng = photoUrl.toLowerCase().endsWith(".png");
                    const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                    page.drawImage(img, {
                        x: 480,
                        y: 535,
                        width: 85,
                        height: 100,
                    });
                } catch (imgErr) {
                    console.error("Failed to embed member photo onto refund form:", imgErr);
                }
            }

            pdfBytes = await pdfDoc.save();
        } else {
            // Dynamic Fallback Generator if template file is missing
            pdfBytes = await generateDynamicRefundForm(loan, totalSavings, dateStr);
        }

        const safeCode = (loan.mfLoanId || loan.customer?.customerCode || "Refund").replace(/[^a-zA-Z0-9_-]/g, "_");

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="Savings_Refund_${safeCode}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Download savings refund form error:", error);
        return NextResponse.json(
            { error: "Failed to generate savings refund form" },
            { status: 500 }
        );
    }
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
    if (!url) throw new Error("No URL provided");
    if (url.startsWith("http://") || url.startsWith("https://")) {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch image");
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    const localPath = path.join(process.cwd(), "public", cleanPath);
    if (fs.existsSync(localPath)) {
        return new Uint8Array(fs.readFileSync(localPath));
    }
    throw new Error("Local image file not found: " + url);
}

// Complete dynamic fallback generator
async function generateDynamicRefundForm(loan: any, totalSavings: number, dateStr: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title / Header
    page.drawText("SAMPLE PRIME SMALL FINANCE PVT LTD", {
        x: 130,
        y: 780,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.35, 0.65),
    });
    page.drawText("SAVINGS REFUND ACKNOWLEDGEMENT FORM", {
        x: 150,
        y: 760,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
    });

    page.drawLine({
        start: { x: 40, y: 745 },
        end: { x: 555, y: 745 },
        thickness: 1,
        color: rgb(0.8, 0.85, 0.9),
    });

    // Sub-header
    page.drawText(`Branch: ${loan.branch?.name || "-"}`, { x: 50, y: 725, size: 9, font: fontBold });
    page.drawText(`Center / Group: ${loan.group?.groupName || "-"}`, { x: 240, y: 725, size: 9, font: fontBold });
    page.drawText(`Date: ${dateStr}`, { x: 450, y: 725, size: 9, font: fontBold });

    // Section 1: Member Details
    page.drawRectangle({
        x: 40,
        y: 690,
        width: 515,
        height: 20,
        color: rgb(0.92, 0.95, 0.98),
    });
    page.drawText("1. MEMBER & LOAN DETAILS", { x: 50, y: 695, size: 9, font: fontBold });

    page.drawText(`Customer Name:`, { x: 50, y: 665, size: 9, font });
    page.drawText(String(loan.customer?.name || "-"), { x: 160, y: 665, size: 9, font: fontBold });

    page.drawText(`Customer Code:`, { x: 320, y: 665, size: 9, font });
    page.drawText(String(loan.customer?.customerCode || "-"), { x: 420, y: 665, size: 9, font: fontBold });

    page.drawText(`Nominee / Relation:`, { x: 50, y: 640, size: 9, font });
    page.drawText(String(loan.customer?.nominee?.name || "-"), { x: 160, y: 640, size: 9, font });

    page.drawText(`Mobile Number:`, { x: 320, y: 640, size: 9, font });
    page.drawText(String(loan.customer?.phone || "-"), { x: 420, y: 640, size: 9, font });

    page.drawText(`Loan ID:`, { x: 50, y: 615, size: 9, font });
    page.drawText(String(loan.mfLoanId || "-"), { x: 160, y: 615, size: 9, font: fontBold });

    page.drawText(`Disbursed Amount:`, { x: 320, y: 615, size: 9, font });
    page.drawText(loan.loanAmount ? `Rs. ${loan.loanAmount.toLocaleString("en-IN")}` : "-", { x: 420, y: 615, size: 9, font });

    // Section 2: Refund Details
    page.drawRectangle({
        x: 40,
        y: 575,
        width: 515,
        height: 20,
        color: rgb(0.92, 0.95, 0.98),
    });
    page.drawText("2. SAVINGS REFUND DETAILS", { x: 50, y: 580, size: 9, font: fontBold });

    page.drawText(`Cumulative Savings Collected:`, { x: 50, y: 550, size: 9, font });
    page.drawText(`Rs. ${totalSavings.toLocaleString("en-IN")}/-`, { x: 230, y: 550, size: 9, font: fontBold });

    page.drawText(`Deductions (if any):`, { x: 50, y: 525, size: 9, font });
    page.drawText(`Rs. 0/-`, { x: 230, y: 525, size: 9, font });

    page.drawText(`Net Amount Refunded:`, { x: 50, y: 500, size: 9, font: fontBold });
    page.drawText(`Rs. ${totalSavings.toLocaleString("en-IN")}/-`, { x: 230, y: 500, size: 10, font: fontBold, color: rgb(0, 0.45, 0) });

    page.drawText(`Disbursement Mode:`, { x: 50, y: 475, size: 9, font });
    page.drawText(`[ X ] Cash   [  ] Bank Transfer   [  ] UPI`, { x: 230, y: 475, size: 9, font });

    // Section 3: Declaration
    page.drawRectangle({
        x: 40,
        y: 435,
        width: 515,
        height: 20,
        color: rgb(0.92, 0.95, 0.98),
    });
    page.drawText("3. MEMBER ACKNOWLEDGEMENT", { x: 50, y: 440, size: 9, font: fontBold });

    page.drawText(
        `I, ${loan.customer?.name || "Customer"}, hereby acknowledge receipt of my savings refund amount of Rs. ${totalSavings.toLocaleString("en-IN")}/- in full and final settlement.`,
        { x: 50, y: 410, size: 8.5, font }
    );

    // Signatures
    const sigY = 320;
    page.drawLine({ start: { x: 50, y: sigY }, end: { x: 150, y: sigY }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    page.drawText("Member Signature", { x: 55, y: sigY - 15, size: 8.5, font: fontBold });

    page.drawLine({ start: { x: 180, y: sigY }, end: { x: 280, y: sigY }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    page.drawText("Field Officer", { x: 200, y: sigY - 15, size: 8.5, font: fontBold });

    page.drawLine({ start: { x: 310, y: sigY }, end: { x: 410, y: sigY }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    page.drawText("Cashier / Teller", { x: 325, y: sigY - 15, size: 8.5, font: fontBold });

    page.drawLine({ start: { x: 440, y: sigY }, end: { x: 540, y: sigY }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    page.drawText("Branch Manager", { x: 450, y: sigY - 15, size: 8.5, font: fontBold });

    return await pdfDoc.save();
}

