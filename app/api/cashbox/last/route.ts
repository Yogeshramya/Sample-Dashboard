import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import CashBox from "@/models/CashBox";

import { getTodayIST, parseISTDate } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    await connectDB();

    const token = await getToken({ req, secret });
    if (!token) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    const filter: Record<string, unknown> = {
        branch: token.branch?._id,
        status: "APPROVED",
    };

    if (token.role === "TELLER") {
        const today = getTodayIST();
        filter.date = {
            $gte: parseISTDate(today, false),
            $lte: parseISTDate(today, true),
        };
    }

    const cashboxes = await CashBox.find(filter)
        .sort({ date: -1 })
        .limit(token.role === "TELLER" ? 1 : 5)
        .lean();

    return NextResponse.json({
        success: true,
        cashbox: cashboxes[0] || null,
        cashboxes,
    });
}
