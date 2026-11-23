import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import PersonalScheme from "@/models/PersonalScheme";
import { calculatePersonalSchemeValues } from "@/lib/personalSchemeCalc";

const secret = process.env.NEXTAUTH_SECRET!;

// Default standard schemes from the official brochure
const DEFAULT_SCHEMES = [
    // Daily schemes
    {
        schemeId: "YPS-D100",
        schemeName: "Smart Daily ₹100",
        schemeType: "STANDARD",
        frequency: "DAILY",
        installmentAmount: 100,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 360,
        totalContribution: 36000,
        benefitAmount: 6000,
        maturityAmount: 42000,
        description: "Daily ₹100 collection for 12 months (360 days) + ₹6,000 company benefit.",
    },
    {
        schemeId: "YPS-D200",
        schemeName: "Smart Daily ₹200",
        schemeType: "STANDARD",
        frequency: "DAILY",
        installmentAmount: 200,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 360,
        totalContribution: 72000,
        benefitAmount: 12000,
        maturityAmount: 84000,
        description: "Daily ₹200 collection for 12 months (360 days) + ₹12,000 company benefit.",
    },
    {
        schemeId: "YPS-D300",
        schemeName: "Smart Daily ₹300",
        schemeType: "STANDARD",
        frequency: "DAILY",
        installmentAmount: 300,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 360,
        totalContribution: 108000,
        benefitAmount: 18000,
        maturityAmount: 126000,
        description: "Daily ₹300 collection for 12 months (360 days) + ₹18,000 company benefit.",
    },
    {
        schemeId: "YPS-D400",
        schemeName: "Smart Daily ₹400",
        schemeType: "STANDARD",
        frequency: "DAILY",
        installmentAmount: 400,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 360,
        totalContribution: 144000,
        benefitAmount: 24000,
        maturityAmount: 168000,
        description: "Daily ₹400 collection for 12 months (360 days) + ₹24,000 company benefit.",
    },
    {
        schemeId: "YPS-D500",
        schemeName: "Smart Daily ₹500",
        schemeType: "STANDARD",
        frequency: "DAILY",
        installmentAmount: 500,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 360,
        totalContribution: 180000,
        benefitAmount: 30000,
        maturityAmount: 210000,
        description: "Daily ₹500 collection for 12 months (360 days) + ₹30,000 company benefit.",
    },

    // Monthly schemes
    {
        schemeId: "YPS-M1000",
        schemeName: "Smart Monthly ₹1,000",
        schemeType: "STANDARD",
        frequency: "MONTHLY",
        installmentAmount: 1000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 12,
        totalContribution: 12000,
        benefitAmount: 2000,
        maturityAmount: 14000,
        description: "Monthly ₹1,000 collection for 12 months + ₹2,000 company benefit.",
    },
    {
        schemeId: "YPS-M2000",
        schemeName: "Smart Monthly ₹2,000",
        schemeType: "STANDARD",
        frequency: "MONTHLY",
        installmentAmount: 2000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 12,
        totalContribution: 24000,
        benefitAmount: 4000,
        maturityAmount: 28000,
        description: "Monthly ₹2,000 collection for 12 months + ₹4,000 company benefit.",
    },
    {
        schemeId: "YPS-M3000",
        schemeName: "Smart Monthly ₹3,000",
        schemeType: "STANDARD",
        frequency: "MONTHLY",
        installmentAmount: 3000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 12,
        totalContribution: 36000,
        benefitAmount: 6000,
        maturityAmount: 42000,
        description: "Monthly ₹3,000 collection for 12 months + ₹6,000 company benefit.",
    },
    {
        schemeId: "YPS-M4000",
        schemeName: "Smart Monthly ₹4,000",
        schemeType: "STANDARD",
        frequency: "MONTHLY",
        installmentAmount: 4000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 12,
        totalContribution: 48000,
        benefitAmount: 8000,
        maturityAmount: 56000,
        description: "Monthly ₹4,000 collection for 12 months + ₹8,000 company benefit.",
    },
    {
        schemeId: "YPS-M5000",
        schemeName: "Smart Monthly ₹5,000",
        schemeType: "STANDARD",
        frequency: "MONTHLY",
        installmentAmount: 5000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 12,
        totalContribution: 60000,
        benefitAmount: 10000,
        maturityAmount: 70000,
        description: "Monthly ₹5,000 collection for 12 months + ₹10,000 company benefit.",
    },

    // Weekly schemes
    {
        schemeId: "YPS-W250",
        schemeName: "Smart Weekly ₹250",
        schemeType: "STANDARD",
        frequency: "WEEKLY",
        installmentAmount: 250,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 52,
        totalContribution: 13000,
        benefitAmount: 2167,
        maturityAmount: 15167,
        description: "Weekly ₹250 collection for 52 weeks + 2-month equivalent benefit.",
    },
    {
        schemeId: "YPS-W500",
        schemeName: "Smart Weekly ₹500",
        schemeType: "STANDARD",
        frequency: "WEEKLY",
        installmentAmount: 500,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 52,
        totalContribution: 26000,
        benefitAmount: 4333,
        maturityAmount: 30333,
        description: "Weekly ₹500 collection for 52 weeks + 2-month equivalent benefit.",
    },
    {
        schemeId: "YPS-W1000",
        schemeName: "Smart Weekly ₹1,000",
        schemeType: "STANDARD",
        frequency: "WEEKLY",
        installmentAmount: 1000,
        durationMonths: 12,
        benefitMonths: 2,
        benefitWeeks: 0,
        benefitDays: 0,
        totalInstallments: 52,
        totalContribution: 52000,
        benefitAmount: 8667,
        maturityAmount: 60667,
        description: "Weekly ₹1,000 collection for 52 weeks + 2-month equivalent benefit.",
    },
];

export async function GET(req: Request) {
    try {
        await connectDB();

        const token = await getToken({ req: req as NextRequest, secret });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const count = await PersonalScheme.countDocuments();
        if (count === 0) {
            await PersonalScheme.insertMany(DEFAULT_SCHEMES);
        }

        const { searchParams } = new URL(req.url);
        const frequency = searchParams.get("frequency");

        const query: Record<string, unknown> = { status: "ACTIVE" };
        if (frequency && frequency !== "ALL") {
            query.frequency = frequency;
        }

        const schemes = await PersonalScheme.find(query).sort({ installmentAmount: 1 }).lean();

        return NextResponse.json({
            success: true,
            count: schemes.length,
            schemes,
        });
    } catch (error) {
        console.error("Personal schemes GET error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();

        const token = await getToken({ req: req as NextRequest, secret });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();

        const installment = Number(data.installmentAmount);
        if (!installment || installment <= 0) {
            return NextResponse.json({ success: false, message: "Valid installment amount is required" }, { status: 400 });
        }

        const frequency = (data.frequency || "DAILY") as "DAILY" | "WEEKLY" | "MONTHLY";
        const schemeType = (data.schemeType || "STANDARD") as "STANDARD" | "CUSTOM";
        const durationMonths = Number(data.durationMonths) || 12;
        const benefitMonths = data.benefitMonths !== undefined ? Number(data.benefitMonths) : 2;
        const benefitWeeks = Number(data.benefitWeeks) || 0;
        const benefitDays = Number(data.benefitDays) || 0;

        const calc = calculatePersonalSchemeValues({
            frequency,
            installmentAmount: installment,
            durationMonths,
            benefitMonths,
            benefitWeeks,
            benefitDays,
        });

        // Determine unique schemeId
        let schemeId = data.schemeId?.trim();
        if (!schemeId) {
            const prefix = schemeType === "CUSTOM" ? "YPS-C" : "YPS-";
            const freqCode = frequency[0];
            const benefitTag = schemeType === "CUSTOM"
                ? `-${calc.benefitMonths}M${calc.benefitWeeks ? `${calc.benefitWeeks}W` : ""}${calc.benefitDays ? `${calc.benefitDays}D` : ""}`
                : "";
            schemeId = `${prefix}${freqCode}${installment}${benefitTag}`;

            const existing = await PersonalScheme.findOne({ schemeId });
            if (existing) {
                schemeId = `${schemeId}-${Date.now().toString().slice(-4)}`;
            }
        }

        const newScheme = new PersonalScheme({
            schemeId,
            schemeName: data.schemeName,
            schemeType,
            frequency,
            installmentAmount: installment,
            durationMonths: calc.durationMonths,
            benefitMonths: calc.benefitMonths,
            benefitWeeks: calc.benefitWeeks,
            benefitDays: calc.benefitDays,
            totalInstallments: calc.totalInstallments,
            totalContribution: calc.totalContribution,
            benefitAmount: calc.benefitAmount,
            maturityAmount: calc.maturityAmount,
            description: data.description || "",
            status: data.status || "ACTIVE",
        });

        await newScheme.save();

        return NextResponse.json({
            success: true,
            scheme: newScheme,
        });
    } catch (error: any) {
        console.error("Personal scheme POST error:", error);
        return NextResponse.json({ success: false, message: error?.message || "Failed to create scheme", error }, { status: 500 });
    }
}
