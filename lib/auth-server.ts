import { auth } from "@/auth"
import { getCurrentUser } from "./auth"
import { mockUsers, type User } from "./mock-data"

function getUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id)
}

function getFallbackUserId(pathname?: string): string {
  if (pathname?.startsWith("/admin")) return "user_7"
  if (pathname?.startsWith("/instructor")) return "user_11"
  return "user_1"
}

interface ServerUserOptions {
  allowPathFallback?: boolean
}

export async function getCurrentUserServer(
  pathname?: string,
  options?: ServerUserOptions,
): Promise<User | undefined> {
  const session = await auth()

  if (session?.user) {
    return {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      role: session.user.role as User["role"],
      status: "ACTIVE",
      createdAt: new Date(0),
    }
  }

  if (options?.allowPathFallback === false) {
    return undefined
  }

  return getUserById(getFallbackUserId(pathname)) ?? getCurrentUser(pathname)
}
