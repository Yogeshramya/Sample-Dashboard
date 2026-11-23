import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import { generateNextSavingsClientCode } from "@/lib/personal-client-code";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const nextCode = await generateNextSavingsClientCode();

        return NextResponse.json({
            success: true,
            nextCode,
        });
    } catch (error) {
        console.error("Failed to generate next personal customer code:", error);
        return NextResponse.json(
            { success: false, nextCode: "YPSS-0001" },
            { status: 500 }
        );
    }
}
