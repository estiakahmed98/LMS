// Mirrors the NextAuth JWT session into a small, non-httpOnly cookie so
// existing client components can keep reading the current user
// synchronously via lib/auth.ts's getCurrentUser() (used in ~15 pages),
// without every one of them being rewritten to next-auth's async useSession().
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-edge";

export const SESSION_MIRROR_COOKIE = "pstc_session_user";

interface SessionUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
}

export default auth((request: NextRequest) => {
  const session = (request as unknown as { auth?: { user?: SessionUser } }).auth;
  const response = NextResponse.next();

  if (session?.user) {
    response.cookies.set(
      SESSION_MIRROR_COOKIE,
      JSON.stringify({
        id: session.user.id,
        role: session.user.role,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }),
      { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 },
    );
  } else {
    response.cookies.delete(SESSION_MIRROR_COOKIE);
  }

  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
