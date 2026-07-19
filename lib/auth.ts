import { mockUsers, type User } from "./mock-data"

export const MOCK_SESSION_COOKIE = "pstc_mock_user_id"
// Set by middleware.ts from the real NextAuth JWT session on every request.
export const SESSION_MIRROR_COOKIE = "pstc_session_user"
export const SESSION_USER_UPDATED_EVENT = "pstc:session-user-updated"

const DEFAULT_STUDENT_ID = "user_1"
const DEFAULT_ADMIN_ID = "user_7"
const DEFAULT_INSTRUCTOR_ID = "user_11"

interface MirroredSessionUser {
  id: string
  role: string
  name?: string | null
  email?: string | null
  photoUrl?: string | null
}

function getUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id)
}

function getFallbackUserId(pathname?: string): string {
  if (pathname?.startsWith("/admin")) return DEFAULT_ADMIN_ID
  if (pathname?.startsWith("/instructor")) return DEFAULT_INSTRUCTOR_ID
  return DEFAULT_STUDENT_ID
}

interface CurrentUserOptions {
  allowPathFallback?: boolean
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined

  const prefix = `${name}=`
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length)
}

function getMirroredSessionUser(): MirroredSessionUser | undefined {
  const raw = getCookieValue(SESSION_MIRROR_COOKIE)
  if (!raw) return undefined
  try {
    return JSON.parse(decodeURIComponent(raw)) as MirroredSessionUser
  } catch {
    return undefined
  }
}

/** Update the client-readable session mirror after profile changes. */
export function patchMirroredSessionUser(updates: {
  name?: string
  email?: string
  photoUrl?: string | null
}) {
  if (typeof window === "undefined") return

  const current = getMirroredSessionUser()
  if (!current) return

  const next: MirroredSessionUser = {
    ...current,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.email !== undefined ? { email: updates.email } : {}),
    ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
  }

  document.cookie = `${SESSION_MIRROR_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
  window.dispatchEvent(new Event(SESSION_USER_UPDATED_EVENT))
}

export function subscribeSessionUserChanges(listener: () => void) {
  if (typeof window === "undefined") return () => {}

  window.addEventListener(SESSION_USER_UPDATED_EVENT, listener)
  return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, listener)
}

/** @deprecated Real accounts are created via signup/admin — this only matters for legacy mock-session fallbacks. */
export function setMockSession(userId: string) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(MOCK_SESSION_COOKIE, userId)
  document.cookie = `${MOCK_SESSION_COOKIE}=${userId}; path=/; max-age=2592000; samesite=lax`
}

export function clearMockSession() {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(MOCK_SESSION_COOKIE)
  document.cookie = `${MOCK_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

// Reads the real, signed-in NextAuth user (mirrored into a readable cookie by
// middleware.ts) when available. On the server there is no `document`, so this
// returns undefined — never invent a mock pathname identity during SSR (that
// caused hydration mismatches like "Fahim Ahmed" vs the real instructor).
export function getCurrentUser(
  pathname?: string,
  options?: CurrentUserOptions,
): User | undefined {
  // SSR / RSC: cookies are not readable via document here.
  if (typeof document === "undefined") {
    return undefined
  }

  const mirrored = getMirroredSessionUser()
  if (mirrored) {
    return {
      id: mirrored.id,
      name: mirrored.name ?? "",
      email: mirrored.email ?? "",
      photoUrl: mirrored.photoUrl ?? null,
      role: mirrored.role as User["role"],
      status: "ACTIVE",
      createdAt: new Date(0),
    }
  }

  const resolvedPathname =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : undefined)

  const sessionUserId =
    window.localStorage.getItem(MOCK_SESSION_COOKIE) ?? getCookieValue(MOCK_SESSION_COOKIE)

  const mockUser = getUserById(sessionUserId ?? "")
  if (mockUser) return mockUser

  if (options?.allowPathFallback === false) {
    return undefined
  }

  return getUserById(getFallbackUserId(resolvedPathname))
}

/** @deprecated Unused now that login goes through NextAuth credentials sign-in. Kept for reference only. */
export function resolveMockLoginUserId(
  email: string,
  access: "STUDENT" | "ADMIN" | "INSTRUCTOR",
  adminRole?: string,
): string {
  const normalizedEmail = email.trim().toLowerCase()

  if (access === "STUDENT") {
    return (
      mockUsers.find(
        (user) => user.role === "STUDENT" && user.email.toLowerCase() === normalizedEmail,
      )?.id ?? DEFAULT_STUDENT_ID
    )
  }

  if (access === "INSTRUCTOR") {
    return (
      mockUsers.find(
        (user) => user.role === "INSTRUCTOR" && user.email.toLowerCase() === normalizedEmail,
      )?.id ?? DEFAULT_INSTRUCTOR_ID
    )
  }

  const roleMap: Record<string, string> = {
    "Super Admin": "SUPER_ADMIN",
    "Course Manager": "COURSE_MANAGER",
    Examiner: "EXAMINER",
    "Report Viewer": "REPORT_VIEWER",
  }

  return (
    mockUsers.find(
      (user) =>
        user.role !== "STUDENT" &&
        (user.email.toLowerCase() === normalizedEmail ||
          user.role === roleMap[adminRole ?? ""] ||
          user.id === DEFAULT_ADMIN_ID),
    )?.id ?? DEFAULT_ADMIN_ID
  )
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
