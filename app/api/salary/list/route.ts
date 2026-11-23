import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Salary from "@/models/Salary";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const employeeIdParam = searchParams.get("employeeId");
        const payPeriodParam = searchParams.get("payPeriod");
        const limitParam = searchParams.get("limit");

        // Filter preparation
        const filter: Record<string, unknown> = {};

        if (token.role === "ADMINISTRATOR") {
            if (employeeIdParam) {
                filter.employee = employeeIdParam;
            }
        } else {
            // Non-admin can only see their own issued salary slips
            filter.employee = token.id;
            filter.status = { $ne: "PENDING" };
        }

        if (payPeriodParam) {
            filter.payPeriod = payPeriodParam;
        }

        let query = Salary.find(filter)
            .populate("branch", "name code")
            .sort({ createdAt: -1 });

        if (limitParam && !isNaN(Number(limitParam))) {
            query = query.limit(Number(limitParam));
        }

        const salaries = await query.lean();

        return NextResponse.json({
            success: true,
            salaries,
        });
    } catch (error: unknown) {
        console.error("Salary list fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load salary slips" },
            { status: 500 }
        );
    }
}
