import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const primaryPath = path.join(process.cwd(), "public/grt_form_updated.pdf");
        const fallbackPath = path.join(process.cwd(), "public/print/FRT.pdf");

        let pdfDoc: PDFDocument;

        if (fs.existsSync(primaryPath)) {
            const bytes = fs.readFileSync(primaryPath);
            pdfDoc = await PDFDocument.load(bytes);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const page = pdfDoc.getPages()[0];

            page.drawText(body.leaderName || "", { x: 140, y: 620, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.husbandName || "", { x: 130, y: 595, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.date || "", { x: 370, y: 570, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.address || "", { x: 80, y: 570, size: 11, font });
        } else if (fs.existsSync(fallbackPath)) {
            const bytes = fs.readFileSync(fallbackPath);
            pdfDoc = await PDFDocument.load(bytes);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const page = pdfDoc.getPages()[0];

            page.drawText(body.leaderName || "", { x: 140, y: 620, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.husbandName || "", { x: 130, y: 595, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.date || "", { x: 370, y: 570, size: 11, font, color: rgb(0, 0, 0) });
            page.drawText(body.address || "", { x: 80, y: 570, size: 11, font });
        } else {
            // Generate clean dynamic PDF fallback
            pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage(PageSizes.A4);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            const { width, height } = page.getSize();

            page.drawText("SAMPLE PRIME SMALL FINANCE PVT LTD", {
                x: 100,
                y: height - 60,
                size: 16,
                font: fontBold,
                color: rgb(0.1, 0.2, 0.4),
            });

            page.drawText("GROUP RECOGNITION TEST (GRT) FORM", {
                x: 140,
                y: height - 85,
                size: 12,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
            });

            let yPos = height - 130;
            const lineHeight = 28;

            const fields = [
                ["Leader Name", body.leaderName || "-"],
                ["Spouse / Father Name", body.husbandName || "-"],
                ["Date", body.date || new Date().toLocaleDateString("en-IN")],
                ["Center / Group Address", body.address || "-"],
                ["Group Name / Code", body.groupName || "-"],
                ["Branch", body.branchName || "-"],
            ];

            for (const [label, val] of fields) {
                page.drawText(`${label}:`, { x: 60, y: yPos, size: 11, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                page.drawText(String(val), { x: 230, y: yPos, size: 11, font, color: rgb(0, 0, 0) });
                yPos -= lineHeight;
            }

            // Signatures block
            yPos -= 50;
            page.drawText("Member Signature", { x: 60, y: yPos, size: 10, font });
            page.drawText("Field Officer Signature", { x: 240, y: yPos, size: 10, font });
            page.drawText("Branch Manager Signature", { x: 420, y: yPos, size: 10, font });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes).buffer], {
            type: "application/pdf",
        });

        return new Response(blob, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=GRT_Filled.pdf",
            },
        });
    } catch (err) {
        console.error("PDF ERROR:", err);
        return new Response("Failed to generate PDF", { status: 500 });
    }
}
