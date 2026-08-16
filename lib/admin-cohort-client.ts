import type {
  AdminCohortDetail,
  AdminCohortInstructorInput,
  AdminCohortPayload,
  AdminCohortSummary,
  AdminCohortWorkspace,
} from "@/lib/admin-cohort-types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? data.error : null;
    throw new Error(message || "Request failed.");
  }
  return data as T;
}

export async function fetchCohorts() {
  const data = await readJson<{ cohorts: AdminCohortSummary[] }>(
    await fetch("/api/admin/cohorts", { cache: "no-store" }),
  );
  return data.cohorts;
}

export async function fetchCohort(cohortId: string) {
  return readJson<AdminCohortWorkspace>(
    await fetch(`/api/admin/cohorts/${cohortId}`, { cache: "no-store" }),
  );
}

export async function createCohort(payload: AdminCohortPayload) {
  const data = await readJson<{ cohort: AdminCohortDetail }>(
    await fetch("/api/admin/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.cohort;
}

export async function updateCohort(cohortId: string, payload: AdminCohortPayload) {
  const data = await readJson<{ cohort: AdminCohortDetail }>(
    await fetch(`/api/admin/cohorts/${cohortId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.cohort;
}

export async function syncCohortCourses(cohortId: string, courseIds: string[]) {
  return readJson<AdminCohortWorkspace>(
    await fetch(`/api/admin/cohorts/${cohortId}/courses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseIds }),
    }),
  );
}

export async function syncCohortMembers(cohortId: string, userIds: string[]) {
  return readJson<AdminCohortWorkspace>(
    await fetch(`/api/admin/cohorts/${cohortId}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    }),
  );
}

export async function syncCohortInstructors(
  cohortId: string,
  assignments: AdminCohortInstructorInput[],
) {
  return readJson<AdminCohortWorkspace>(
    await fetch(`/api/admin/cohorts/${cohortId}/instructors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    }),
  );
}
