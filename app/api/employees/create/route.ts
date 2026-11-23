import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const token = await getToken({ req, secret });

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { name, email, password, role, branch, branches } =
            await req.json();

        if (!name || !email || !password || !role) {
            return NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
            );
        }

        /* ---------------- ROLE PERMISSIONS ---------------- */

        if (token.role === "ADMINISTRATOR" || token.role === "ACCOUNTS_HEAD") {
            if (role === "ADMINISTRATOR") {
                return NextResponse.json(
                    { error: "Cannot create an administrator account" },
                    { status: 403 }
                );
            }
        } else if (token.role === "AREA_MANAGER") {
            if (
                role !== "MANAGER" &&
                role !== "EMPLOYEE_MFI" &&
                role !== "TELLER"
            ) {
                return NextResponse.json(
                    { error: "Area manager can only create managers, employees, or tellers" },
                    { status: 403 }
                );
            }
        } else if (token.role === "MANAGER") {
            if (role !== "EMPLOYEE_MFI" && role !== "TELLER") {
                return NextResponse.json(
                    { error: "Manager can only create employees or tellers" },
                    { status: 403 }
                );
            }
        } else {
            return NextResponse.json(
                { error: "Not allowed" },
                { status: 403 }
            );
        }

        /* ---------------- BRANCH LOGIC ---------------- */

        let branchId: mongoose.Types.ObjectId | null = null;
        let branchIds: mongoose.Types.ObjectId[] = [];

        /* AREA MANAGER */
        if (role === "AREA_MANAGER") {
            if (!branches || branches.length === 0) {
                return NextResponse.json(
                    { error: "Area manager must have branches" },
                    { status: 400 }
                );
            }

            branchIds = branches.map((b: string) => {
                if (!mongoose.Types.ObjectId.isValid(b)) {
                    throw new Error("Invalid branch ID");
                }
                return new mongoose.Types.ObjectId(b);
            });
        }

        /* ACCOUNTS HEAD */
        if (role === "ACCOUNTS_HEAD") {
            if (branch && mongoose.Types.ObjectId.isValid(branch)) {
                branchId = new mongoose.Types.ObjectId(branch);
            }
        }

        /* MANAGER / EMPLOYEE / TELLER */
        if (
            role === "MANAGER" ||
            role === "EMPLOYEE_MFI" ||
            role === "TELLER"
        ) {
            /* Manager creating employee/teller */
            if (token.role === "MANAGER") {
                if (!token.branch) {
                    return NextResponse.json(
                        { error: "Manager has no assigned branch" },
                        { status: 400 }
                    );
                }
                branchId = new mongoose.Types.ObjectId(token.branch._id);
            } else if (token.role === "AREA_MANAGER") {
                /* Area manager creating */
                if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
                    return NextResponse.json(
                        { error: "Invalid branch" },
                        { status: 400 }
                    );
                }

                if (!token.branches?.includes(branch)) {
                    return NextResponse.json(
                        { error: "Branch not assigned to you" },
                        { status: 403 }
                    );
                }

                branchId = new mongoose.Types.ObjectId(branch);
            } else {
                /* Admin creating */
                if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
                    return NextResponse.json(
                        { error: "Invalid branch" },
                        { status: 400 }
                    );
                }

                branchId = new mongoose.Types.ObjectId(branch);
            }
        }

        /* ---------------- EMAIL UNIQUE ---------------- */

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 409 }
            );
        }

        /* ---------------- PASSWORD ---------------- */

        const hashed = await bcrypt.hash(password, 10);

        /* ---------------- CREATE USER ---------------- */

        const newUser = await User.create({
            name,
            email,
            password: hashed,
            role,
            branch:
                role === "MANAGER" ||
                role === "EMPLOYEE_MFI" ||
                role === "TELLER" ||
                role === "ACCOUNTS_HEAD"
                    ? branchId
                    : null,
            branches:
                role === "AREA_MANAGER"
                    ? branchIds
                    : []
        });

        return NextResponse.json(
            { success: true, user: newUser },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
