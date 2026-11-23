import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PersonalClient from "@/models/PersonalClient";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";
import { generateNextSavingsClientCode } from "@/lib/personal-client-code";

/* ================= GET PERSONAL CLIENTS ================= */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const query: Record<string, unknown> = {};

        // Strict branch isolation
        if (ctx.branchObjectId) {
            query.branchId = ctx.branchObjectId;
        } else if (!ctx.isAdmin) {
            return NextResponse.json({ success: true, count: 0, clients: [] });
        }

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { clientId: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { panNumber: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.status = status;
        }

        if (from && to) {
            const start = new Date(from);
            const end = new Date(to);
            end.setUTCHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const clients = await PersonalClient.find(query)
            .populate("branchId", "name")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            count: clients.length,
            clients,
        });
    } catch (error) {
        console.error("Personal client GET error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

/* ================= CREATE PERSONAL CLIENT ================= */
export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const data = await req.json();

        // Non-admins must strictly belong to their assigned branch
        const assignedBranchId = ctx.isAdmin
            ? (data.branchId || ctx.branchId)
            : ctx.branchId;

        if (!assignedBranchId) {
            return NextResponse.json(
                { success: false, error: "A valid branch is required to create a client" },
                { status: 400 }
            );
        }

        // Map nominee fields to guarantor fields if sent as nominee
        const guarantorName = data.nomineeName || data.guarantorName || "Nominee";
        const guarantorMobile = data.nomineeMobile || data.guarantorMobile || data.mobile;
        const guarantorRelation = data.nomineeRelation || data.guarantorRelation || "Family";
        const guarantorAddress = data.nomineeAddress || data.guarantorAddress || data.address || "-";
        const guarantorAadhaar = data.nomineeAadhaar || data.guarantorAadhaar || "";

        // 2. Duplicate existence check (check mobile/pan globally)
        const cleanPan = data.panNumber?.toUpperCase().trim();
        const orConditions: Array<Record<string, unknown>> = [
            { mobile: data.mobile },
        ];

        if (cleanPan && cleanPan !== "NOTPROVIDED") {
            orConditions.push({ panNumber: cleanPan });
        }

        const existingClient = await PersonalClient.findOne({
            $or: orConditions,
        }).select("_id fullName clientId mobile panNumber");

        if (existingClient) {
            const isPanConflict = Boolean(cleanPan && cleanPan !== "NOTPROVIDED" && existingClient.panNumber === cleanPan);
            return NextResponse.json(
                {
                    success: false,
                    exists: true,
                    message: isPanConflict
                        ? "A customer already exists with this PAN number"
                        : "A customer already exists with this mobile number",
                    conflictWith: {
                        customerId: existingClient._id,
                        customerCode: existingClient.clientId,
                        name: existingClient.fullName,
                        phone: existingClient.mobile,
                    },
                },
                { status: 409 }
            );
        }

        // Resolve unique clientId (auto-generate YPSS-0001+ if missing or already taken due to concurrent submission)
        let resolvedClientId = typeof data.clientId === "string" ? data.clientId.trim() : "";
        if (!resolvedClientId) {
            resolvedClientId = await generateNextSavingsClientCode();
        } else {
            const codeTaken = await PersonalClient.exists({ clientId: resolvedClientId });
            if (codeTaken) {
                resolvedClientId = await generateNextSavingsClientCode();
            }
        }

        // 3. Save Personal Client
        const newClient = new PersonalClient({
            ...data,
            clientId: resolvedClientId,
            guarantorName,
            guarantorMobile,
            guarantorRelation,
            guarantorAddress,
            guarantorAadhaar,
            panNumber: cleanPan && cleanPan !== "NOTPROVIDED" ? cleanPan : "NOTPROVIDED",
            branchId: assignedBranchId,
            status: "PENDING",
        });

        await newClient.save();

        return NextResponse.json({
            success: true,
            client: newClient,
        });
    } catch (error) {
        console.error("Personal client POST error:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
