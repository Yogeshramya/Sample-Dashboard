import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    /* ================= NOT LOGGED ================= */

    if (!token) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    const role = token.role;

    /* ================= ROUTE GROUPS ================= */

    const adminOnlyRoutes = [
        "/dashboard/branches",
        "/dashboard/employees",
        "/dashboard/bill/manage",
        "/dashboard/personal/employees",
        "/dashboard/personal/debit/manage",
        "/dashboard/personal/credit/manage",
    ];

    const managerRestrictedRoutes = [
        "/dashboard/approval",
        "/dashboard/branches",
        "/dashboard/employees",

        "/dashboard/group/manage",
        "/dashboard/group/add",
        "/dashboard/group/close",

        "/dashboard/scheme/new",

        "/dashboard/credit/manage",
        "/dashboard/credit/title",

        "/dashboard/debit/manage",
        "/dashboard/debit/title",

        "/dashboard/bill/partial",
        "/dashboard/bill/prebill",

        // Smart Savings Personal restrictions for Managers
        "/dashboard/personal/employees",
        "/dashboard/personal/debit/title",
        "/dashboard/personal/credit/title",
    ];

    const tellerRestrictedRoutes = [
        ...managerRestrictedRoutes,

        // Extra Teller specific blocks
        "/dashboard/remittance/approval",
        "/dashboard/group/add",
        "/dashboard/scheme/manage",
        "/dashboard/scheme/new",
        "/dashboard/scheme/edit",
        "/dashboard/bill/partial",
        "/dashboard/bill/prebill",
        "/dashboard/credit/manage",
        "/dashboard/credit/title",
        "/dashboard/debit/manage",
        "/dashboard/debit/title",

        // Personal / Smart Savings restrictions
        "/dashboard/personal/approval",
        "/dashboard/personal/scheme/new",
        "/dashboard/personal/scheme/edit",
        "/dashboard/personal/fund/approval",
        "/dashboard/personal/debit/manage",
        "/dashboard/personal/credit/manage",
        "/dashboard/personal/debit/title",
        "/dashboard/personal/credit/title",
    ];

    const staffRestrictedRoutes = [
        "/dashboard/approval",
        "/dashboard/branches",
        "/dashboard/employees",

        "/dashboard/group/manage",
        "/dashboard/group/add",
        "/dashboard/group/close",

        "/dashboard/client/edit",

        "/dashboard/fund/manage",
        "/dashboard/fund/provide",
        "/dashboard/fund/return",

        "/dashboard/scheme/new",

        "/dashboard/credit/manage",
        "/dashboard/credit/entry",
        "/dashboard/credit/report",
        "/dashboard/credit/title",

        "/dashboard/debit/manage",
        "/dashboard/debit/entry",
        "/dashboard/debit/report",
        "/dashboard/debit/title",

        "/dashboard/bill/partial",
        "/dashboard/bill/prebill",

        "/dashboard/report/day-sheet",
        "/dashboard/report/summary-report",

        // Personal / Smart Savings restrictions
        "/dashboard/personal/approval",
        "/dashboard/personal/employees",
        "/dashboard/personal/scheme/new",
        "/dashboard/personal/scheme/edit",
        "/dashboard/personal/fund/approval",
        "/dashboard/personal/debit",
        "/dashboard/personal/credit",
        "/dashboard/personal/trial-balance",
        "/dashboard/personal/remittance",
        "/dashboard/personal/report/day-sheet",
    ];

    const isClientEditRoute =
        pathname.startsWith("/dashboard/client/") &&
        pathname.endsWith("/edit");

    /* ================= ADMIN ================= */

    if (role === "ADMINISTRATOR") {
        return NextResponse.next();
    }

    /* ================= ACCOUNTS HEAD ================= */

    if (role === "ACCOUNTS_HEAD") {
        const payrollRoutes = [
            "/dashboard/staff-salary",
            "/dashboard/salary",
            "/dashboard/employees/salary",
        ];

        if (payrollRoutes.some((route) => pathname.startsWith(route))) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        return NextResponse.next();
    }

    /* ================= AREA MANAGER + MANAGER ================= */

    if (role === "AREA_MANAGER" || role === "MANAGER") {
        if (
            adminOnlyRoutes.some((route) => pathname.startsWith(route)) ||
            managerRestrictedRoutes.some((route) => pathname.startsWith(route))
        ) {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    }

    /* ================= TELLER ================= */

    if (role === "TELLER") {
        const blockedForTeller =
            adminOnlyRoutes.some((route) => pathname.startsWith(route)) ||
            tellerRestrictedRoutes.some((route) => pathname.startsWith(route)) ||
            isClientEditRoute;

        if (blockedForTeller) {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    }

    /* ================= STAFF (EMPLOYEE_MFI) ================= */

    if (role === "EMPLOYEE_MFI") {
        const blockedForStaff =
            staffRestrictedRoutes.some((route) => pathname.startsWith(route)) ||
            isClientEditRoute;

        if (blockedForStaff) {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    }

    /* ================= DEFAULT BLOCK ================= */

    return NextResponse.redirect(new URL("/unauthorized", req.url));
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
