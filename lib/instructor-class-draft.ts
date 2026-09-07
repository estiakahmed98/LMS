import type { AdminClassCohortOption } from './admin-class-types';
import type { InstructorCourseOption } from './instructor-class-types';

export function initialInstructorClassScope(course: InstructorCourseOption | undefined, cohorts: AdminClassCohortOption[]) {
  const cohort = cohorts.find(item => item.courseId === course?.id);
  return {
    courseId: course?.id ?? '',
    subjectName: course?.title ?? '',
    batchId: cohort?.batchId ?? null,
    batchCourseId: cohort?.batchCourseId ?? null,
    batchName: cohort?.name ?? (course?.canTeachCourseWide ? 'All enrolled learners' : ''),
  };
}
