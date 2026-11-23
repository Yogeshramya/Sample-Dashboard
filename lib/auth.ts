import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "./db";
import UserModel from "@/models/User";
import type { NextAuthOptions, User } from "next-auth";
import Branch from "@/models/Branch";

const populateFields = [
    { path: "branch", select: "name code", model: Branch },
    { path: "branches", select: "name code", model: Branch },
];

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials) {
                await connectDB();

                const user = await UserModel
                    .findOne({ email: credentials?.email })
                    .populate(populateFields);

                if (!user) throw new Error("No user found");

                const isValid = await compare(credentials!.password, user.password);
                if (!isValid) throw new Error("Invalid password");

                return user;
            },
        }),
    ],

    session: {
        strategy: "jwt",
    },

    // CUSTOM COOKIE CONFIGURATION FOR TAB-CLOSE LOGOUT
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production"
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                // Omitting maxAge / expires converts this into a session-only cookie.
                // The browser will automatically destroy it when the tab/window is closed.
            },
        },
    },

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            /* ---------- LOGIN ---------- */
            if (user) {
                token.id = (user as User)._id;
                token.role = user.role;
                token.branch = (user as User).branch ?? null;
                token.branches = (user as User).branches ?? [];

                /* ---------- MANAGER / EMPLOYEE / TELLER ---------- */
                if (
                    user.role === "MANAGER" ||
                    user.role === "EMPLOYEE_MFI" ||
                    user.role === "TELLER"
                ) {
                    token.activeBranch = (user as User).branch ?? null;
                }

                /* ---------- AREA MANAGER ---------- */
                if (user.role === "AREA_MANAGER") {
                    token.activeBranch = (user as User).branches?.[0] ?? null;
                    token.branch = token.activeBranch;
                }

                /* ---------- ADMINISTRATOR / ACCOUNTS_HEAD ---------- */
                if (user.role === "ADMINISTRATOR" || user.role === "ACCOUNTS_HEAD") {
                    if (!(user as User).branch) {
                        const firstBranch = await Branch.findOne().select("name code");

                        if (firstBranch) {
                            token.activeBranch = firstBranch;
                            token.branch = firstBranch;
                        } else {
                            token.activeBranch = null;
                            token.branch = null;
                        }
                    } else {
                        token.activeBranch = (user as User).branch;
                    }
                }
            }

            /* ---------- SESSION UPDATE (branch switch) ---------- */
            if (trigger === "update" && session?.user?.activeBranch) {
                token.activeBranch = session.user.activeBranch ?? null;
                token.branch = session.user.activeBranch ?? null;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role;
                session.user.branch = token.branch ?? null;
                session.user.branches = token.branches ?? [];
                session.user.activeBranch = token.activeBranch ?? null;
            }

            return session;
        }
    },

    pages: {
        signIn: "/",
    },
};
