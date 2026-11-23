import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";

import { getTodayIST, parseISTDate } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET!;

interface BillReportQuery {
    branch: {
        _id: string;
        name: string;
    };
    collectedAt?: {
        $gte?: Date;
        $lte?: Date;
    };
    group?: string;
    employee?: string;
    type?: string;
    status?: string;
}

export async function GET(req: NextRequest) {
    await connectDB();

    /* ---------- AUTH ---------- */
    const token = await getToken({ req, secret });

    if (!token || !token.branch) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    const branch = token.branch;

    const { searchParams } = new URL(req.url);
    let from = searchParams.get("from");
    let to = searchParams.get("to");
    const group = searchParams.get("group");
    const employee = searchParams.get("employee");
    const type = searchParams.get("type");

    // Tellers can only fetch current date report
    if (token.role === "TELLER") {
        const today = getTodayIST();
        from = today;
        to = today;
    }

    /* ---------- BASE QUERY (branch enforced) ---------- */
    const query: BillReportQuery = {
        branch,
        status: "APPROVED",
    };

    if (type) {
        query.type = type || "Normal"; // "PreClose"
    }

    /* ---------- DATE FILTER ---------- */
    if (from || to) {
        query.collectedAt = {};

        if (from) {
            query.collectedAt.$gte = parseISTDate(from, false);
        }

        if (to) {
            query.collectedAt.$lte = parseISTDate(to, true);
        }
    }

    /* ---------- GROUP FILTER ---------- */
    if (group && group !== "ALL") {
        query.group = group;
    }

    /* ---------- EMPLOYEE FILTER ---------- */
    if (employee && employee !== "ALL") {
        query.employee = employee;
    }

    const bills = await Bill.find(query)
        .populate("group", "groupName")
        .populate("employee", "name")
        .sort({ collectedAt: -1 });

    return NextResponse.json({
        success: true,
        bills,
    });
}
