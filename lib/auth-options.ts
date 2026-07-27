// Full NextAuth (v5) configuration — Credentials provider backed by Prisma.
// Node runtime only: used by auth.ts (the /api/auth route handler and
// server-side auth() calls). Never import this from middleware.ts — see
// lib/auth-edge-config.ts for the Edge-safe subset that file must use.
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authEdgeConfig } from "@/lib/auth-edge-config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password";
import { auditAuthEvent } from "@/lib/audit";

/** Longest user-agent we store; anything beyond this is noise. */
const MAX_USER_AGENT_LENGTH = 400;

/**
 * Best-effort client IP from the sign-in request. Proxies put the real
 * address first in x-forwarded-for; the rest are fallbacks for other hosts.
 */
function readRequestContext(request: Request | undefined) {
  if (!request) return { ipAddress: null, userAgent: null };

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null;

  const userAgent = request.headers.get("user-agent");

  return {
    ipAddress,
    userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}

export const authConfig: NextAuthConfig = {
  ...authEdgeConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        const role = credentials?.role;
        const context = readRequestContext(request);

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Every rejection below is recorded with a distinct reason. The
        // sign-in form deliberately shows the user a single generic error —
        // revealing which check failed would let an attacker enumerate valid
        // addresses — but the audit trail keeps the real reason for review.
        const denied = async (reason: string, userId?: string, userRole?: string) => {
          await auditAuthEvent({
            action: "auth.login.failed",
            email: normalizedEmail,
            userId: userId ?? null,
            role: userRole ?? null,
            detail: { reason, attemptedRole: role ?? null },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          });
          return null;
        };

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) {
          return denied("unknown_account");
        }

        if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
          return denied(`account_${user.status.toLowerCase()}`, user.id, user.role);
        }

        if (typeof role === "string" && role) {
          const adminRoles = ["SUPER_ADMIN", "COURSE_MANAGER", "EXAMINER", "REPORT_VIEWER"];
          const matchesSelectedRole =
            role === "ADMIN" ? adminRoles.includes(user.role) : user.role === role;
          if (!matchesSelectedRole) {
            return denied("role_mismatch", user.id, user.role);
          }
        }

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) {
          return denied("invalid_password", user.id, user.role);
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActive: new Date() },
        });

        await auditAuthEvent({
          action: "auth.login.succeeded",
          email: normalizedEmail,
          userId: user.id,
          role: user.role,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
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
