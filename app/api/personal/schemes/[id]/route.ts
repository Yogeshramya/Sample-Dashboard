import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import PersonalScheme from "@/models/PersonalScheme";
import { calculatePersonalSchemeValues } from "@/lib/personalSchemeCalc";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const scheme = await PersonalScheme.findById(id).lean();
        if (!scheme) {
            return NextResponse.json({ success: false, message: "Scheme not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, scheme });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const updateData: Record<string, unknown> = { ...body };

        if (
            body.installmentAmount !== undefined ||
            body.frequency !== undefined ||
            body.benefitMonths !== undefined ||
            body.benefitWeeks !== undefined ||
            body.benefitDays !== undefined ||
            body.durationMonths !== undefined ||
            body.schemeType !== undefined
        ) {
            const current = await PersonalScheme.findById(id);
            if (!current) {
                return NextResponse.json({ success: false, message: "Scheme not found" }, { status: 404 });
            }

            const installment = Number(body.installmentAmount !== undefined ? body.installmentAmount : current.installmentAmount);
            const freq = (body.frequency || current.frequency) as "DAILY" | "WEEKLY" | "MONTHLY";
            const durationMonths = Number(body.durationMonths !== undefined ? body.durationMonths : current.durationMonths) || 12;
            const benefitMonths = Number(body.benefitMonths !== undefined ? body.benefitMonths : (current.benefitMonths ?? 2));
            const benefitWeeks = Number(body.benefitWeeks !== undefined ? body.benefitWeeks : (current.benefitWeeks ?? 0));
            const benefitDays = Number(body.benefitDays !== undefined ? body.benefitDays : (current.benefitDays ?? 0));

            const calc = calculatePersonalSchemeValues({
                frequency: freq,
                installmentAmount: installment,
                durationMonths,
                benefitMonths,
                benefitWeeks,
                benefitDays,
            });

            updateData.installmentAmount = installment;
            updateData.frequency = freq;
            updateData.durationMonths = calc.durationMonths;
            updateData.benefitMonths = calc.benefitMonths;
            updateData.benefitWeeks = calc.benefitWeeks;
            updateData.benefitDays = calc.benefitDays;
            updateData.totalInstallments = calc.totalInstallments;
            updateData.totalContribution = calc.totalContribution;
            updateData.benefitAmount = calc.benefitAmount;
            updateData.maturityAmount = calc.maturityAmount;
            if (body.schemeType) updateData.schemeType = body.schemeType;
        }

        const updated = await PersonalScheme.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return NextResponse.json({ success: false, message: "Scheme not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, scheme: updated });
    } catch (error) {
        console.error("Scheme update error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await PersonalScheme.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Scheme deleted" });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
