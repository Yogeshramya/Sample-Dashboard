import { getToken, JWT } from "next-auth/jwt";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export interface BranchContext {
    token: JWT | null;
    userId: string | null;
    role: string | null;
    isAdmin: boolean;
    isTeller: boolean;
    branchId: string | null;
    branchObjectId: mongoose.Types.ObjectId | null;
    unauthorized: boolean;
    errorResponse?: { error: string; status: number };
}

/**
 * Extracts normalized branch info from token and optional request search params.
 * - Non-administrators (Manager, Teller, Employee, etc.) are strictly locked to their
 *   assigned active branch or branch. They cannot tamper with or bypass this via query parameters.
 * - Administrators can switch branch via session activeBranch or optional query param (?branchId= or ?branch=).
 */
export function extractBranchContext(
    token: JWT | null,
    searchParams?: URLSearchParams | null
): BranchContext {
    if (!token) {
        return {
            token: null,
            userId: null,
            role: null,
            isAdmin: false,
            isTeller: false,
            branchId: null,
            branchObjectId: null,
            unauthorized: true,
            errorResponse: { error: "Unauthorized", status: 401 },
        };
    }

    const role = (token.role as string) || "";
    const isAdmin = ["ADMINISTRATOR", "ADMIN", "SUPER_ADMIN", "ACCOUNTS_HEAD"].includes(role);
    const isTeller = role === "TELLER";
    const userId = (token.id as string) || null;

    // Helper to resolve string ID from raw branch field (handles both string and object {_id})
    const resolveId = (b: unknown): string | null => {
        if (!b) return null;
        if (typeof b === "string" && mongoose.Types.ObjectId.isValid(b)) return b;
        if (typeof b === "object" && b !== null) {
            const id = (b as { _id?: unknown })._id;
            if (id && mongoose.Types.ObjectId.isValid(String(id))) return String(id);
        }
        return null;
    };

    const tokenBranchId = resolveId(token.activeBranch) || resolveId(token.branch);

    let finalBranchId: string | null = null;

    if (!isAdmin) {
        // Non-admins MUST strictly use their assigned branch
        if (!tokenBranchId) {
            return {
                token,
                userId,
                role,
                isAdmin: false,
                isTeller,
                branchId: null,
                branchObjectId: null,
                unauthorized: true,
                errorResponse: { error: "No branch assigned to this account", status: 403 },
            };
        }
        finalBranchId = tokenBranchId;
    } else {
        // Administrators: check query param first, then fall back to activeBranch
        const paramBranch =
            searchParams?.get("branchId") ||
            searchParams?.get("branch");

        if (paramBranch && paramBranch !== "ALL" && mongoose.Types.ObjectId.isValid(paramBranch)) {
            finalBranchId = paramBranch;
        } else if (paramBranch === "ALL") {
            finalBranchId = null;
        } else if (tokenBranchId) {
            finalBranchId = tokenBranchId;
        }
    }

    const branchObjectId = finalBranchId && mongoose.Types.ObjectId.isValid(finalBranchId)
        ? new mongoose.Types.ObjectId(finalBranchId)
        : null;

    return {
        token,
        userId,
        role,
        isAdmin,
        isTeller,
        branchId: finalBranchId,
        branchObjectId,
        unauthorized: false,
    };
}

/**
 * Convenience helper to extract branch context directly from NextRequest.
 */
export async function getBranchContext(
    req: NextRequest | Request,
    secret: string = process.env.NEXTAUTH_SECRET!
): Promise<BranchContext> {
    const token = await getToken({
        req: req as NextRequest,
        secret,
    });

    let searchParams: URLSearchParams | null = null;
    try {
        const url = new URL(req.url);
        searchParams = url.searchParams;
    } catch {
        // ignore invalid URL parsing
    }

    const ctx = extractBranchContext(token, searchParams);

    // If administrator has no branch specified, fallback to the first active branch in DB
    if (ctx.isAdmin && !ctx.branchObjectId) {
        try {
            const Branch = mongoose.models.Branch || (await import("@/models/Branch")).default;
            const firstBranch = await Branch.findOne().select("_id").lean();
            if (firstBranch?._id) {
                ctx.branchId = String(firstBranch._id);
                ctx.branchObjectId = new mongoose.Types.ObjectId(String(firstBranch._id));
            }
        } catch {
            // fallback gracefully
        }
    }

    return ctx;
}

/**
 * Build standard Mongoose find filter for MFI models (using 'branch').
 */
export function buildMFIFilter(ctx: BranchContext, baseQuery: Record<string, unknown> = {}): Record<string, unknown> {
    const query = { ...baseQuery };
    if (ctx.branchObjectId) {
        query.branch = ctx.branchObjectId;
    }
    return query;
}

/**
 * Build standard Mongoose find filter for Personal/Savings models (using 'branchId').
 */
export function buildPersonalFilter(ctx: BranchContext, baseQuery: Record<string, unknown> = {}): Record<string, unknown> {
    const query = { ...baseQuery };
    if (ctx.branchObjectId) {
        query.branchId = ctx.branchObjectId;
    }
    return query;
}

/**
 * Generate standard error response if context is unauthorized.
 */
export function unauthorizedBranchResponse(ctx: BranchContext): NextResponse | null {
    if (ctx.unauthorized && ctx.errorResponse) {
        return NextResponse.json(
            { success: false, error: ctx.errorResponse.error },
            { status: ctx.errorResponse.status }
        );
    }
    return null;
}

