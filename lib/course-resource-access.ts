import "server-only";

import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import type { AuthorizedUser } from "@/lib/rbac";
import { RbacError } from "@/lib/rbac";

/**
 * Admin roles are platform-scoped. Instructors are resource-scoped and may
 * only use courses explicitly assigned through an approved enrollment or an
 * owned live class.
 */
export async function assertCourseResourceAccess(
  user: AuthorizedUser,
  courseId: string,
) {
  if (user.role !== "INSTRUCTOR") return;

  const assignedIds = await listInstructorAssignedCourseIds(user.id);
  if (!assignedIds.has(courseId)) {
    throw new RbacError("You are not assigned to this course.", 403);
  }
}
