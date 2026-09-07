import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: { enrollment: { findMany: vi.fn() }, liveClass: { findMany: vi.fn() } } }));
import { prisma } from './prisma';
import { listInstructorCourseWideIds, resolveCourseWideClassScope } from './instructor-class-access';
import { initialInstructorClassScope } from './instructor-class-draft';
import type { AdminClassCohortOption } from './admin-class-types';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue([{ courseId: 'direct' }] as never);
  vi.mocked(prisma.liveClass.findMany).mockResolvedValue([{ courseId: 'legacy' }] as never);
});

it('allows a directly assigned course without a batch mapping', async () => {
  expect(await resolveCourseWideClassScope('instructor', 'direct', null)).toEqual({ batchId: null, batchCourseId: null, batchName: 'All enrolled learners' });
});

it('retains course-wide teaching for existing unscoped classes', async () => {
  expect(await listInstructorCourseWideIds('instructor')).toEqual(new Set(['direct', 'legacy']));
  expect(prisma.liveClass.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ instructorId: 'instructor', batchId: null }) }));
});

it('does not turn batch-only or grading access into course-wide teaching', async () => {
  await expect(resolveCourseWideClassScope('instructor', 'batch-only', null)).rejects.toThrow('direct course teaching assignment');
  await expect(resolveCourseWideClassScope('instructor', 'unassigned', null)).rejects.toThrow('direct course teaching assignment');
});

it('rejects a batch ID without its corresponding cohort mapping', async () => {
  await expect(resolveCourseWideClassScope('instructor', 'direct', 'foreign-batch')).rejects.toThrow('valid cohort course');
});

it('initializes an assigned course without hiding it when no cohorts exist', () => {
  expect(initialInstructorClassScope({ id: 'direct', title: 'Direct course', canTeachCourseWide: true }, [])).toEqual({ courseId: 'direct', subjectName: 'Direct course', batchId: null, batchCourseId: null, batchName: 'All enrolled learners' });
});

it('selects only a matching cohort and clears stale batch IDs when changing courses', () => {
  const cohorts = [{ courseId: 'batch-course', batchId: 'batch', batchCourseId: 'mapping', name: 'Batch A' }] as AdminClassCohortOption[];
  expect(initialInstructorClassScope({ id: 'batch-course', title: 'Batch course' }, cohorts).batchCourseId).toBe('mapping');
  expect(initialInstructorClassScope({ id: 'direct', title: 'Direct', canTeachCourseWide: true }, cohorts).batchCourseId).toBeNull();
  expect(initialInstructorClassScope({ id: 'grading-only', title: 'Grading' }, cohorts).batchName).toBe('');
});
