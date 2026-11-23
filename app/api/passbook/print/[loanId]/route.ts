import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

import Loans from "@/models/Loan";
import Client from "@/models/Client";
import Group from "@/models/Group";
import Scheme from "@/models/Scheme";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { Loan } from "@/types/fund";

const secret = process.env.NEXTAUTH_SECRET!;

// Define the coordinate schema
interface SchemeLayoutConfig {
    fontSize: number;
    leftSide: {
        customerCode: { x: number; y: number };
        name: { x: number; y: number };
        nominee: { x: number; y: number };
        phone: { x: number; y: number };
        branch: { x: number; y: number };
    };
    rightSide: {
        loanAmount: { x: number; y: number };
        firstDueDate: { x: number; y: number };
        durationWeeks: { x: number; y: number };
        fixedFee: { x: number; y: number };
    };
    photo: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    datesTable: {
        startX: number;
        startY: number;
        rowHeight: number;
        fontSize: number;
    };
}

// Layout coordinate configurations
const SCHEME_LAYOUTS: Record<string, SchemeLayoutConfig> = {
    "1001": {
        fontSize: 9,
        leftSide: {
            customerCode: { x: 150, y: 650 },
            name: { x: 150, y: 625 },
            nominee: { x: 150, y: 600 },
            phone: { x: 150, y: 576 },
            branch: { x: 20, y: 700 },
        },
        rightSide: {
            loanAmount: { x: 420, y: 650 },
            firstDueDate: { x: 410, y: 624 },
            durationWeeks: { x: 410, y: 600 },
            fixedFee: { x: 420, y: 575 },
        },
        photo: {
            x: 425,
            y: 702,
            width: 100,
            height: 110,
        },
        datesTable: {
            startX: 50,
            startY: 505,
            rowHeight: 18.2,
            fontSize: 10,
        },
    },
    "1002": {
        fontSize: 9,
        leftSide: {
            customerCode: { x: 155, y: 663 },
            name: { x: 155, y: 642 },
            nominee: { x: 155, y: 620 },
            phone: { x: 155, y: 595 },
            branch: { x: 35, y: 705 },
        },
        rightSide: {
            loanAmount: { x: 415, y: 663 },
            firstDueDate: { x: 405, y: 639 },
            durationWeeks: { x: 405, y: 620 },
            fixedFee: { x: 415, y: 595 },
        },
        photo: {
            x: 413,
            y: 709,
            width: 90,
            height: 100,
        },
        datesTable: {
            startX: 55,
            startY: 523,
            rowHeight: 14.2,
            fontSize: 9,
        },
    },
    "1003": {
        fontSize: 9,
        leftSide: {
            customerCode: { x: 155, y: 655 },
            name: { x: 155, y: 634 },
            nominee: { x: 155, y: 612 },
            phone: { x: 155, y: 587 },
            branch: { x: 35, y: 697 },
        },
        rightSide: {
            loanAmount: { x: 415, y: 655 },
            firstDueDate: { x: 405, y: 631 },
            durationWeeks: { x: 405, y: 612 },
            fixedFee: { x: 415, y: 587 },
        },
        photo: {
            x: 413,
            y: 709,
            width: 90,
            height: 100,
        },
        datesTable: {
            startX: 55,
            startY: 518,
            rowHeight: 14.4,
            fontSize: 9,
        },
    },
};

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ loanId: string }> }
) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { loanId } = await params;

        const loan: Loan | null = await Loans.findById(loanId).populate([
            { path: "customer", model: Client },
            { path: "group", model: Group },
            { path: "scheme", model: Scheme },
            { path: "employee", model: User },
            { path: "branch", model: Branch },
        ]);

        if (!loan) {
            return NextResponse.json({ error: "Loan not found" }, { status: 404 });
        }

        const scheme = (loan.scheme && typeof loan.scheme === "object" ? loan.scheme : null) || {
            schemeId: "1001",
            schemeName: "Standard",
            rows: [],
        };
        const schemeKey = String(scheme.schemeId || "").trim();

        const totalWeeks =
            (loan.dues && Array.isArray(loan.dues) && loan.dues.length > 0 ? loan.dues.length : 0) ||
            (scheme.rows && Array.isArray(scheme.rows) && scheme.rows.length > 0 ? scheme.rows.length : 0) ||
            25;

        // Template resolution:
        // 1. Try exact public/scheme/${schemeKey}.pdf
        // 2. If not found, fallback to 1002.pdf (if >25 weeks) or 1001.pdf (if <=25 weeks)
        // 3. Fallback to any available scheme template
        const schemeDir = path.join(process.cwd(), "public", "scheme");
        const specificPath = schemeKey ? path.join(schemeDir, `${schemeKey}.pdf`) : null;

        let templatePath: string | null = null;
        let configKey = "1001";

        if (specificPath && fs.existsSync(specificPath)) {
            templatePath = specificPath;
            configKey = schemeKey in SCHEME_LAYOUTS ? schemeKey : (totalWeeks > 25 ? "1002" : "1001");
        } else {
            const preferredFallback = totalWeeks > 25 ? "1002" : "1001";
            const secondaryFallback = totalWeeks > 25 ? "1001" : "1002";

            const primaryPath = path.join(schemeDir, `${preferredFallback}.pdf`);
            const secondaryPath = path.join(schemeDir, `${secondaryFallback}.pdf`);

            if (fs.existsSync(primaryPath)) {
                templatePath = primaryPath;
                configKey = preferredFallback;
            } else if (fs.existsSync(secondaryPath)) {
                templatePath = secondaryPath;
                configKey = secondaryFallback;
            }
        }

        let pdfBytes: Uint8Array;

        if (templatePath && fs.existsSync(templatePath)) {
            // Overlay on the pre-printed PDF template
            const templateBytes = fs.readFileSync(templatePath);
            const pdfDoc = await PDFDocument.load(templateBytes);

            const displayFilename = `Passbook_${loan.mfLoanId || "Form"}.pdf`;
            pdfDoc.setTitle(displayFilename);

            const page = pdfDoc.getPages()[0];
            const config = SCHEME_LAYOUTS[configKey] || SCHEME_LAYOUTS["1001"];
            const { fontSize, leftSide, rightSide, photo, datesTable } = config;

            // Left side fields
            page.drawText(String(loan.customer?.customerCode || "-"), { ...leftSide.customerCode, size: fontSize });
            page.drawText(String(loan.customer?.name || "-"), { ...leftSide.name, size: fontSize });
            page.drawText(String(loan.customer?.nominee?.name || "-"), { ...leftSide.nominee, size: fontSize });
            page.drawText(String(loan.customer?.phone || "-"), { ...leftSide.phone, size: fontSize });
            page.drawText("Branch: " + (loan.branch?.name || "-"), { ...leftSide.branch, size: fontSize });

            // Right side fields
            page.drawText(String(loan.loanAmount || 0), { ...rightSide.loanAmount, size: fontSize });

            const firstDueDateStr = loan.firstDueDate && !isNaN(new Date(loan.firstDueDate).getTime())
                ? new Date(loan.firstDueDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                })
                : "-";

            page.drawText(firstDueDateStr, { ...rightSide.firstDueDate, size: fontSize });
            page.drawText(`${totalWeeks} weeks`, { ...rightSide.durationWeeks, size: fontSize });
            page.drawText("50", { ...rightSide.fixedFee, size: fontSize });

            // Member Photo
            const photoUrl = loan.customer?.memberPhoto;
            if (photoUrl) {
                try {
                    const imageBytes = await fetchImageBytes(photoUrl);
                    const isPng = photoUrl.toLowerCase().endsWith(".png");
                    const image = isPng
                        ? await pdfDoc.embedPng(imageBytes)
                        : await pdfDoc.embedJpg(imageBytes);

                    page.drawImage(image, {
                        x: photo.x,
                        y: photo.y,
                        width: photo.width,
                        height: photo.height,
                    });
                } catch (error) {
                    console.error("Failed to embed member photo:", error);
                }
            }

            // Weekly collection dates table
            const collectionDate = loan.firstDueDate && !isNaN(new Date(loan.firstDueDate).getTime())
                ? new Date(loan.firstDueDate)
                : (loan.loanDate && !isNaN(new Date(loan.loanDate).getTime()) ? new Date(loan.loanDate) : new Date());

            for (let i = 0; i < totalWeeks; i++) {
                const currentY = datesTable.startY - i * datesTable.rowHeight;
                if (currentY < 35) break;

                const dateString = collectionDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                });

                page.drawText(dateString, {
                    x: datesTable.startX,
                    y: currentY,
                    size: datesTable.fontSize,
                });

                collectionDate.setDate(collectionDate.getDate() + 7);
            }

            pdfBytes = await pdfDoc.save();
        } else {
            // Dynamic fallback: Generate complete passbook document from scratch
            pdfBytes = await generateDynamicPassbook(loan, scheme, totalWeeks);
        }

        const sanitizedLoanId = (loan.mfLoanId || schemeKey || "Passbook").replace(/[^a-zA-Z0-9_-]/g, "_");

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="Passbook_${sanitizedLoanId}.pdf"`,
            },
        });
    } catch (err) {
        console.error("Passbook Print Error:", err);
        return NextResponse.json(
            { error: "Failed to generate passbook PDF" },
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

async function generateDynamicPassbook(loan: Loan, scheme: { schemeId?: string; schemeName?: string }, totalRows: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([538.5, 813.75]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title / Header
    page.drawText("SAMPLE PRIME MICROFINANCE", {
        x: 145,
        y: 770,
        size: 16,
        font: fontBold,
        color: rgb(0.12, 0.35, 0.65),
    });
    page.drawText("CUSTOMER LOAN PASSBOOK", {
        x: 180,
        y: 750,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Divider line
    page.drawLine({
        start: { x: 35, y: 735 },
        end: { x: 503, y: 735 },
        thickness: 1,
        color: rgb(0.8, 0.85, 0.9),
    });

    // Left info
    page.drawText(`Customer Code: ${loan.customer?.customerCode || "-"}`, { x: 45, y: 710, size: 9, font: fontBold });
    page.drawText(`Customer Name: ${loan.customer?.name || "-"}`, { x: 45, y: 690, size: 9, font });
    page.drawText(`Nominee Name:  ${loan.customer?.nominee?.name || "-"}`, { x: 45, y: 670, size: 9, font });
    page.drawText(`Phone:         ${loan.customer?.phone || "-"}`, { x: 45, y: 650, size: 9, font });
    page.drawText(`Branch:        ${loan.branch?.name || "-"}`, { x: 45, y: 630, size: 9, font });

    // Right info
    page.drawText(`MF Loan ID:    ${loan.mfLoanId || "-"}`, { x: 310, y: 710, size: 9, font: fontBold });
    page.drawText(`Loan Amount:   ₹${loan.loanAmount?.toLocaleString() || "0"}`, { x: 310, y: 690, size: 9, font: fontBold });
    page.drawText(`First Due Date: ${loan.firstDueDate ? new Date(loan.firstDueDate).toLocaleDateString("en-IN") : "-"}`, { x: 310, y: 670, size: 9, font });
    page.drawText(`Tenure:        ${loan.dues?.length || totalRows} weeks`, { x: 310, y: 650, size: 9, font });
    page.drawText(`Scheme:        ${scheme.schemeName || scheme.schemeId || "-"}`, { x: 310, y: 630, size: 9, font });

    // Table Header
    const tableTop = 600;
    page.drawRectangle({
        x: 35,
        y: tableTop - 20,
        width: 468,
        height: 20,
        color: rgb(0.92, 0.95, 0.98),
    });

    page.drawText("Wk #", { x: 45, y: tableTop - 14, size: 8.5, font: fontBold });
    page.drawText("Due Date", { x: 90, y: tableTop - 14, size: 8.5, font: fontBold });
    page.drawText("Principal", { x: 195, y: tableTop - 14, size: 8.5, font: fontBold });
    page.drawText("Interest", { x: 275, y: tableTop - 14, size: 8.5, font: fontBold });
    page.drawText("Total Due", { x: 355, y: tableTop - 14, size: 8.5, font: fontBold });
    page.drawText("Sign / Stamp", { x: 435, y: tableTop - 14, size: 8.5, font: fontBold });

    // Rows
    const collectionDate = loan.firstDueDate && !isNaN(new Date(loan.firstDueDate).getTime())
        ? new Date(loan.firstDueDate)
        : (loan.loanDate && !isNaN(new Date(loan.loanDate).getTime()) ? new Date(loan.loanDate) : new Date());

    const dues = loan.dues && Array.isArray(loan.dues) ? loan.dues : [];
    const rowHeight = totalRows > 25 ? 14 : 17;
    const startY = tableTop - 34;

    for (let i = 0; i < totalRows; i++) {
        const y = startY - i * rowHeight;
        if (y < 30) break;

        const dueItem = dues[i];
        const dateStr = collectionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
        collectionDate.setDate(collectionDate.getDate() + 7);

        page.drawText(String(i + 1), { x: 45, y, size: 8, font });
        page.drawText(dateStr, { x: 90, y, size: 8, font });
        page.drawText(dueItem ? `₹${dueItem.principal || 0}` : "-", { x: 195, y, size: 8, font });
        page.drawText(dueItem ? `₹${dueItem.interest || 0}` : "-", { x: 275, y, size: 8, font });
        page.drawText(dueItem ? `₹${dueItem.total || 0}` : "-", { x: 355, y, size: 8, font: fontBold });
        page.drawText("[       ]", { x: 440, y, size: 8, font, color: rgb(0.65, 0.65, 0.65) });
    }

    return await pdfDoc.save();
}
