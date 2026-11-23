import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const expenses = await Expense.find().populate("userId").sort({ createdAt: -1 });
        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Get expenses error:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const expense = await Expense.create({
            ...body,
            userId: token.id,
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error("Create expense error:", error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
