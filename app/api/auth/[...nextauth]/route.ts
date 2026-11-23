import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const handler = async (
    req: NextRequest,
    context: { params: Promise<{ nextauth: string[] }> }
) => {
    // Await params to comply with Next.js 15+ App Router type contract
    const params = await context.params;

    // 1. Execute NextAuth handler with resolved params
    const response = (await NextAuth(req, { params }, authOptions)) as NextResponse;

    // 2. Intercept response cookies
    if (response && response.headers) {
        const setCookieHeaders = response.headers.getSetCookie();

        if (setCookieHeaders.length > 0) {
            response.headers.delete("Set-Cookie");

            setCookieHeaders.forEach((cookie) => {
                // Check for session token (works for both dev and production SSL cookie names)
                if (cookie.includes("next-auth.session-token")) {
                    // Strip out 'Expires' and 'Max-Age' to force it as a true Session Cookie
                    const sessionCookie = cookie
                        .replace(/Expires=[^;]+;?/i, "")
                        .replace(/Max-Age=[^;]+;?/i, "");

                    response.headers.append("Set-Cookie", sessionCookie);
                } else {
                    response.headers.append("Set-Cookie", cookie);
                }
            });
        }
    }

    return response;
};

export { handler as GET, handler as POST };