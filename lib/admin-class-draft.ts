import type { AdminClassCohortOption } from "./admin-class-types";
import type { AdminCourseSummary } from "./admin-course-types";

export function initialAdminClassScope(
  course: Pick<AdminCourseSummary, "id" | "instructors"> | undefined,
  cohorts: AdminClassCohortOption[],
  preferredInstructorId = "",
) {
  const direct = course?.instructors ?? [];
  const cohort = direct.length ? undefined : cohorts.find((item) => item.courseId === course?.id);
  const instructors = cohort?.instructors ?? direct;
  return {
    instructorId: (instructors.find((item) => item.id === preferredInstructorId) ?? instructors[0])?.id ?? "",
    batchId: cohort?.batchId ?? null,
    batchCourseId: cohort?.batchCourseId ?? null,
    batchName: cohort?.name ?? "All enrolled learners",
  };
}
