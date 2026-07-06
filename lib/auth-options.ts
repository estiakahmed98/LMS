// Full NextAuth (v5) configuration — Credentials provider backed by Prisma.
// Node runtime only: used by auth.ts (the /api/auth route handler and
// server-side auth() calls). Never import this from middleware.ts — see
// lib/auth-edge-config.ts for the Edge-safe subset that file must use.
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authEdgeConfig } from "@/lib/auth-edge-config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password";

export const authConfig: NextAuthConfig = {
  ...authEdgeConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED" || user.status === "INACTIVE") return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActive: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
};
