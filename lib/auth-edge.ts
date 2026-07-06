// Edge-safe auth() — used only by middleware.ts.
import NextAuth from "next-auth";
import { authEdgeConfig } from "@/lib/auth-edge-config";

export const { auth } = NextAuth(authEdgeConfig);
