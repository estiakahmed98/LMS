import type {
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserSummary,
  AdminUserUpdatePayload,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/admin-user-types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data ? data.error : null;
    throw new Error(message || "Request failed.");
  }

  return data as T;
}

export async function fetchUsers(role?: UserRoleValue, courseId?: string) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (courseId) params.set("courseId", courseId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await readJson<{ users: AdminUserSummary[] }>(
    await fetch(`/api/admin/users${query}`, { cache: "no-store" }),
  );
  return data.users;
}

export async function createUser(payload: AdminUserCreatePayload) {
  const data = await readJson<{ user: AdminUserSummary }>(
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.user;
}

export async function updateUserStatus(userId: string, status: UserStatusValue) {
  const data = await readJson<{ user: AdminUserSummary }>(
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
  return data.user;
}

export async function deleteUser(userId: string) {
  await readJson<{ ok: boolean }>(
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
  );
}

export async function fetchUser(userId: string) {
  const data = await readJson<{ user: AdminUserDetail }>(
    await fetch(`/api/admin/users/${userId}`, { cache: "no-store" }),
  );
  return data.user;
}

export async function updateUser(userId: string, payload: AdminUserUpdatePayload) {
  const data = await readJson<{ user: AdminUserDetail }>(
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.user;
}

export async function enrollUserInCourse(userId: string, courseId: string) {
  const data = await readJson<{ user: AdminUserDetail }>(
    await fetch(`/api/admin/users/${userId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    }),
  );
  return data.user;
}

export async function unenrollUserFromCourse(userId: string, enrollmentId: string) {
  const data = await readJson<{ user: AdminUserDetail }>(
    await fetch(`/api/admin/users/${userId}/enrollments/${enrollmentId}`, {
      method: "DELETE",
    }),
  );
  return data.user;
}
