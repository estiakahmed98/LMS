import { mockUsers, type User } from "./mock-data"

export const MOCK_SESSION_COOKIE = "pstc_mock_user_id"

const DEFAULT_STUDENT_ID = "user_1"
const DEFAULT_ADMIN_ID = "user_7"

function getUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id)
}

function getFallbackUserId(pathname?: string): string {
  return pathname?.startsWith("/admin") ? DEFAULT_ADMIN_ID : DEFAULT_STUDENT_ID
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

export function getCurrentUser(pathname?: string): User | undefined {
  const resolvedPathname =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : undefined)

  const sessionUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(MOCK_SESSION_COOKIE) ?? getCookieValue(MOCK_SESSION_COOKIE)
      : undefined

  return (
    getUserById(sessionUserId ?? "") ??
    getUserById(getFallbackUserId(resolvedPathname))
  )
}

export function resolveMockLoginUserId(
  email: string,
  access: "STUDENT" | "ADMIN",
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
