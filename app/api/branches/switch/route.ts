import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { branchId } = await req.json();
        if (!branchId) {
            return NextResponse.json({ error: "branchId is required" }, { status: 400 });
        }

        const branch = await Branch.findById(branchId).select("name code");
        if (!branch) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const role = session.user.role;

        if (role === "AREA_MANAGER") {
            const hasBranch = user.branches?.some(
                (b: unknown) => String(b) === String(branchId) || String((b as { _id?: unknown })._id) === String(branchId)
            );
            if (!hasBranch) {
                return NextResponse.json({ error: "Not allowed to access this branch" }, { status: 403 });
            }
        } else if (role !== "ADMINISTRATOR" && role !== "ACCOUNTS_HEAD") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            activeBranch: {
                _id: String(branch._id),
                name: branch.name,
                code: branch.code,
            },
        });
    } catch (error) {
        console.error("Branch switch error:", error);
        return NextResponse.json({ error: "Failed to switch branch" }, { status: 500 });
    }
}
