//lib/auth-edge-config.ts
import type { NextAuthConfig } from "next-auth";

export const authEdgeConfig: NextAuthConfig = {
  // Auth.js derives callback URLs from the request host. This app is served
  // directly by Next.js or behind our deployment proxy, so those host headers
  // are trusted (and this also allows local production runs via `next start`).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
