import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Salary from "@/models/Salary";
import mongoose from "mongoose";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const token = await getToken({ req, secret });
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        let salary;
        if (mongoose.Types.ObjectId.isValid(id)) {
            salary = await Salary.findById(id).populate("branch").lean();
        }

        if (!salary) {
            salary = await Salary.findOne({ slipId: id }).populate("branch").lean();
        }

        if (!salary) {
            return NextResponse.json(
                { success: false, error: "Salary slip not found" },
                { status: 404 }
            );
        }

        // Permission check
        if (
            token.role !== "ADMINISTRATOR" &&
            String(salary.employee) !== String(token.id)
        ) {
            return NextResponse.json(
                { success: false, error: "Access denied" },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            salary,
        });
    } catch (error: unknown) {
        console.error("Salary fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch salary details" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const token = await getToken({ req, secret });
        if (!token || token.role !== "ADMINISTRATOR") {
            return NextResponse.json(
                { success: false, error: "Admin authorization required" },
                { status: 403 }
            );
        }

        let deleted;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await Salary.findByIdAndDelete(id);
        }
        if (!deleted) {
            deleted = await Salary.findOneAndDelete({ slipId: id });
        }

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Salary slip not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Salary slip deleted successfully",
        });
    } catch (error: unknown) {
        console.error("Salary delete error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete salary slip" },
            { status: 500 }
        );
    }
}
