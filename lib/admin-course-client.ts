import type {
  AdminCourseDetail,
  AdminCoursePayload,
  AdminCourseSummary,
  AdminModuleDetail,
  AdminModulePayload,
} from "@/lib/admin-course-types";

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

export async function fetchCourses() {
  const data = await readJson<{ courses: AdminCourseSummary[] }>(
    await fetch("/api/admin/courses", { cache: "no-store" }),
  );
  return data.courses;
}

export async function fetchCourse(courseId: string) {
  const data = await readJson<{ course: AdminCourseDetail }>(
    await fetch(`/api/admin/courses/${courseId}`, { cache: "no-store" }),
  );
  return data.course;
}

export async function createCourse(payload: AdminCoursePayload) {
  const data = await readJson<{ course: AdminCourseDetail }>(
    await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.course;
}

export async function updateCourse(courseId: string, payload: AdminCoursePayload) {
  const data = await readJson<{ course: AdminCourseDetail }>(
    await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.course;
}

export async function deleteCourse(courseId: string) {
  await readJson<{ ok: boolean }>(
    await fetch(`/api/admin/courses/${courseId}`, {
      method: "DELETE",
    }),
  );
}

export async function createModule(
  courseId: string,
  payload: AdminModulePayload,
) {
  const data = await readJson<{ module: AdminModuleDetail }>(
    await fetch(`/api/admin/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.module;
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  payload: AdminModulePayload,
) {
  const data = await readJson<{ module: AdminModuleDetail }>(
    await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.module;
}

export async function deleteModule(courseId: string, moduleId: string) {
  await readJson<{ ok: boolean }>(
    await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
      method: "DELETE",
    }),
  );
}

export async function uploadAdminFile(
  file: File,
  folder: "courses" | "course-modules" | "course-resources",
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const data = await readJson<{ url: string; name: string; size: number }>(
    await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    }),
  );

  return data;
}
