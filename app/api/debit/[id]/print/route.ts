import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import fs from "fs";
import path from "path";
import Debit from "@/models/Debit";
import Branch from "@/models/Branch";
import User from "@/models/User";
import { Debit as IDebit } from "@/types/debit";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDB();

    const ctx = await getBranchContext(req);
    const unauth = unauthorizedBranchResponse(ctx);
    if (unauth) return unauth;

    const { id } = await params;

    const debit = (await Debit.findById(id).populate([
        { path: "branch", model: Branch },
        { path: "employee", model: User },
    ])) as IDebit | null;

    if (!debit) {
        return NextResponse.json({ error: "Expense voucher not found" }, { status: 404 });
    }

    if (!ctx.isAdmin) {
        const debitBranchStr = debit.branch && typeof debit.branch === "object"
            ? String((debit.branch as { _id?: unknown })._id)
            : String(debit.branch || "");
        if (debitBranchStr !== ctx.branchId) {
            return NextResponse.json({ error: "Expense voucher not found" }, { status: 404 });
        }
    }

    // Load template
    const templatePath = path.join(process.cwd(), "public", "print/expense-v2.pdf");
    if (!fs.existsSync(templatePath)) {
        return NextResponse.json(
            { error: "expense.pdf template not found in public folder" },
            { status: 404 }
        );
    }

    const templateBytes = fs.readFileSync(templatePath);
    const templateDoc = await PDFDocument.load(templateBytes);

    // Create standard A4 portrait document (595.28 x 841.89 pt)
    const finalDoc = await PDFDocument.create();
    const a4Page = finalDoc.addPage(PageSizes.A4);
    const a4Width = PageSizes.A4[0];
    const a4Height = PageSizes.A4[1];

    // Embed and place template at the top with 20pt side margin
    const [embeddedTemplate] = await finalDoc.embedPages(templateDoc.getPages());
    const marginX = 20;
    const targetWidth = a4Width - marginX * 2; // ~555pt
    const scaleFactor = targetWidth / embeddedTemplate.width;
    const targetHeight = embeddedTemplate.height * scaleFactor;

    // Place voucher at the top margin (leaving 20pt from top edge)
    const startY = a4Height - 20 - targetHeight;

    a4Page.drawPage(embeddedTemplate, {
        x: marginX,
        y: startY,
        width: targetWidth,
        height: targetHeight,
    });

    const fontRegular = await finalDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);
    const textColor = rgb(0.1, 0.1, 0.1);

    /* ================= ACCURATE BOX FIELD COORDINATES =================
       All coordinates are relative to startY (bottom of the placed voucher).
    =================================================================== */

    // 1. Branch Name (Top Left Box)
    a4Page.drawText(debit.branch?.name || "Main Branch", {
        x: marginX + 30,
        y: startY + targetHeight * 0.73 + 3,
        size: 9.5,
        font: fontBold,
        color: textColor,
    });

    // 2. Date (Top Center Box)
    const voucherDate = debit.date
        ? new Date(debit.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : "-";
    a4Page.drawText(voucherDate, {
        x: marginX + targetWidth * 0.505,
        y: startY + targetHeight * 0.73 + 3,
        size: 9.5,
        font: fontBold,
        color: textColor,
    });

    // 3. Voucher No (Top Right Box)
    a4Page.drawText(String(debit?.code || "-").toUpperCase(), {
        x: marginX + targetWidth * 0.740,
        y: startY + targetHeight * 0.73 + 3,
        size: 7.5,
        font: fontBold,
        color: textColor,
    });

    // 4. Expenses Head / Particulars (Full width middle box)
    a4Page.drawText(debit.title || "-", {
        x: marginX + 28,
        y: startY + targetHeight * 0.585 + 10,
        size: 9.5,
        font: fontRegular,
        color: textColor,
    });

    // 5. Paid To / Beneficiary Name (Left Box)
    const beneficiary = debit.employee?.name || "Self / Vendor";
    a4Page.drawText(beneficiary, {
        x: marginX + 28,
        y: startY + targetHeight * 0.445 + 17,
        size: 9.5,
        font: fontRegular,
        color: textColor,
    });

    // 6. Amount (Right Box next to Paid To)
    const formattedAmount = `Rs. ${Number(debit.amount || 0).toLocaleString("en-IN")}/-`;
    a4Page.drawText(formattedAmount, {
        x: marginX + targetWidth * 0.655 - 4,
        y: startY + targetHeight * 0.445 + 17,
        size: 10.5,
        font: fontBold,
        color: textColor,
    });

    // 8. Remarks / Details (Bottom-left box)
    a4Page.drawText(debit.details || "Paid towards daily business expense.", {
        x: marginX + 28,
        y: startY + targetHeight * 0.20 + 17,
        size: 8.5,
        font: fontRegular,
        color: textColor,
        maxWidth: targetWidth * 0.46,
        lineHeight: 12,
    });

    const modeUpper = (debit.mode || "CASH").toUpperCase().trim();
    const dotY = startY + targetHeight * 0.347;

    if (modeUpper.includes("CASH")) {
        // Dot inside [ ] Cash box
        a4Page.drawCircle({
            x: marginX + targetWidth * 0.373 - 173.5,
            y: dotY + 15.5,
            size: 2.5,
            color: textColor,
        });
    } else if (
        modeUpper.includes("BANK") ||
        modeUpper.includes("TRANSFER") ||
        modeUpper.includes("NEFT")
    ) {
        // Dot inside [ ] Bank Transfer / NEFT box
        a4Page.drawCircle({
            x: marginX + targetWidth * 0.483 - 50.8,
            y: dotY + 15.5,
            size: 2.5,
            color: textColor,
        });
    } else if (modeUpper.includes("UPI") || modeUpper.includes("QR")) {
        // Dot inside [ ] UPI/QR box
        a4Page.drawCircle({
            x: marginX + targetWidth * 0.773 - 173.5,
            y: dotY + 15.5,
            size: 2.5,
            color: textColor,
        });
    } else if (modeUpper.includes("CHEQUE")) {
        // Dot inside [ ] Cheque box
        a4Page.drawCircle({
            x: marginX + targetWidth * 0.892 - 173.5,
            y: dotY + 15.5,
            size: 2.5,
            color: textColor,
        });
    }

    const pdfBytes = await finalDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="Expense_${debit._id}.pdf"`,
        },
    });
}
