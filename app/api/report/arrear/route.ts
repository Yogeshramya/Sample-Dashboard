import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import ArrearLoan from "@/models/Arrear";
import { syncArrearLoans } from "@/lib/arrear";
import { getTodayIST, parseISTDate } from "@/lib/ist";

const secret = process.env.NEXTAUTH_SECRET;

interface ArrearFilter {
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
    updatedAt?: {
        $gte?: Date;
        $lte?: Date;
    };
    group?: string;
    branch?: string;
    status?: "OPEN" | "CLOSED";
}

export async function GET(req: NextRequest) {
    try {
        if (!secret) {
            console.error("NEXTAUTH_SECRET is not configured");

            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        const token = await getToken({ req, secret });

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const activeBranch = token.activeBranch || token.branch;
        const branchId =
            typeof activeBranch === "string"
                ? activeBranch
                : activeBranch?._id;

        await connectDB();

        // Ensure arrear loans are fully synchronized with current loan dues
        try {
            await syncArrearLoans(branchId ? String(branchId) : undefined);
        } catch (syncErr) {
            console.error("Arrear sync warning:", syncErr);
        }

        const { searchParams } = new URL(req.url);
        const role = token.role;

        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const query: ArrearFilter = {};

        if (branchId) {
            query.branch = String(branchId);
        }

        // Optional group filter
        const group = searchParams.get("group");
        if (group && group !== "ALL") {
            query.group = group;
        }

        // Optional status filter
        const status = searchParams.get("status");
        if (status && status !== "ALL") {
            if (status !== "OPEN" && status !== "CLOSED") {
                return NextResponse.json(
                    { success: false, error: "Invalid arrear status" },
                    { status: 400 }
                );
            }
            query.status = status;
        }

        // Teller role: prioritize current open arrears for collection today,
        // and if closed is filtered, show today's closures.
        if (role === "TELLER") {
            const today = getTodayIST();
            const startOfDay = parseISTDate(today, false);
            const endOfDay = parseISTDate(today, true);

            if (!status || status === "ALL") {
                // Show all currently open arrears ready for collection today,
                // plus any arrears closed today
                (query as Record<string, unknown>).$or = [
                    { status: "OPEN" },
                    { status: "CLOSED", updatedAt: { $gte: startOfDay, $lte: endOfDay } },
                ];
            } else if (status === "CLOSED") {
                query.updatedAt = { $gte: startOfDay, $lte: endOfDay };
            }
        } else if (from || to) {
            // Non-teller date filter
            if (from && to && from > to) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Start date cannot be after end date",
                    },
                    { status: 400 }
                );
            }

            const startDate = from ? parseISTDate(from, false) : undefined;
            const endDate = to ? parseISTDate(to, true) : undefined;

            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const arrears = await ArrearLoan.find(query)
            .populate("group", "groupName groupId collectionDay")
            .populate({
                path: "loan",
                select: "mfLoanId loanAmount customer phone",
                populate: {
                    path: "customer",
                    select: "name phone customerCode",
                },
            })
            .sort({ status: 1, remainingAmount: -1, createdAt: -1 })
            .lean();

        return NextResponse.json(
            {
                success: true,
                arrears,
            },
            {
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                },
            }
        );
    } catch (error) {
        console.error("Arrear report error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to load arrear report",
            },
            { status: 500 }
        );
    }
}
