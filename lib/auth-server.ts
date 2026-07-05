import { cookies } from "next/headers"
import { getCurrentUser, MOCK_SESSION_COOKIE } from "./auth"
import { mockUsers, type User } from "./mock-data"

function getUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id)
}

function getFallbackUserId(pathname?: string): string {
  if (pathname?.startsWith("/admin")) return "user_7"
  if (pathname?.startsWith("/instructor")) return "user_11"
  return "user_1"
}

export async function getCurrentUserServer(pathname?: string): Promise<User | undefined> {
  const cookieStore = await cookies()
  const sessionUserId = cookieStore.get(MOCK_SESSION_COOKIE)?.value

  return getUserById(sessionUserId ?? "") ?? getUserById(getFallbackUserId(pathname)) ?? getCurrentUser(pathname)
}
