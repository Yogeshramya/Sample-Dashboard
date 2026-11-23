import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { PDFDocument } from "pdf-lib";
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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ loanId: string }> }
) {
    await connectDB();

    const token = await getToken({ req, secret });
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { loanId } = await params;

    // Fetch loan with relations
    const loan: Loan = await Loans.findById(loanId)
        .populate([
            { path: "customer", model: Client },
            { path: "group", model: Group },
            { path: "scheme", model: Scheme },
            { path: "employee", model: User },
            { path: "branch", model: Branch }
        ]);

    if (!loan) {
        return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // const scheme = loan.scheme;

    // TARGET THE SPECIFIC BASE TEMPLATE NAME REQUIRED: public/loan_sheet.pdf
    const templatePath = path.join(
        process.cwd(),
        "public",
        "print/loan_sheet.pdf"
    );

    if (!fs.existsSync(templatePath)) {
        return NextResponse.json(
            { error: "Loan credit form template (loan_sheet.pdf) not found inside public directory" },
            { status: 404 }
        );
    }

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const displayFilename = `Loan_Sheet_${loan.mfLoanId || "Form"}.pdf`;
    pdfDoc.setTitle(displayFilename);

    const page = pdfDoc.getPages()[0];
    const page1 = pdfDoc.getPages()[1];

    const fontSize = 8;

    // Fill header fields onto loan_sheet.pdf
    // page.drawText(loan.branch?.name || '-', { x: 90, y: 685, size: fontSize }); // branch name
    page.drawText(loan.customer.name, { x: 140, y: 618, size: fontSize }); // customer name
    page.drawText(
        new Date(loan.customer.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) || '-',
        { x: 105, y: 590, size: fontSize }); // customer dob
    page.drawText(loan.customer.nominee?.name || "-", { x: 422, y: 618, size: fontSize }); // nominee name
    page.drawText(loan.customer.nominee?.relation || "-", { x: 458, y: 590, size: fontSize }); // nominee relation

    const address1 = [
        loan.customer.doorStreet,

    ].filter(Boolean);

    const address2 = [
        loan.customer.area,
        loan.customer.city,
        loan.customer.district,
        loan.customer.state || "Tamil Nadu",
    ].filter(Boolean);

    const address1String = address1.join(", ");
    const address2String = address2.join(", ");

    page.drawText(address1String, { x: 80, y: 534, size: fontSize }); // address line 1
    page.drawText(address2String, { x: 35, y: 505, size: fontSize }); // address line 2

    page.drawText(loan.customer.postalCode, { x: 118, y: 477, size: fontSize }); // postal code
    page.drawText(loan.customer.occupation || "-", { x: 150, y: 419, size: fontSize }); // customer occupation
    page.drawText(loan.customer.nominee.occupation || "-", { x: 150, y: 448, size: fontSize }); // nominee occupation

    page.drawText(loan.customer.aadhar || "-", { x: 105, y: 391, size: fontSize }); // customer aadhar
    //page.drawText(loan.customer.nominee.phone, { x: 150, y: 450, size: fontSize });


    page1.drawText(loan.group?.groupName || "-", { x: 100, y: 600, size: fontSize });

    page.drawText('Cash', { x: 589, y: 607, size: fontSize });
    page.drawText(
        new Date(loan.firstDueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
        { x: 589, y: 589, size: fontSize }
    );

    const photoUrl = loan.customer.memberPhoto;

    if (photoUrl) {
        try {
            const imageBytes = await fetchImageBytes(photoUrl);
            const image = photoUrl.endsWith(".png")
                ? await pdfDoc.embedPng(imageBytes)
                : await pdfDoc.embedJpg(imageBytes);

            page.drawImage(image, {
                x: 420,
                y: 646,
                width: 142,
                height: 172,
            });
        } catch (error) {
            console.error("Failed to embed image:", error);
            // Non-fatal error, proceed without image
        }
    }

    // Export PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            // inline option forces browser rendering with filename fallback
            "Content-Disposition": `inline; filename="${displayFilename}"`,
        },
    });
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image");
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}