import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {
  enrollment: { findMany: vi.fn() }, liveClassSession: { findMany: vi.fn() }, liveClass: { groupBy: vi.fn() },
} }));
vi.mock('@/lib/learner-auth-server', () => ({ requireLearner: vi.fn(), LearnerAuthError: class extends Error {} }));
import { prisma } from './prisma';
import { getLearnerLiveClasses } from './learner-live-server';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue([{ courseId: 'allowed', course: { id: 'allowed', title: 'Course', description: '' } }] as never);
  vi.mocked(prisma.liveClassSession.findMany).mockResolvedValue([]);
  vi.mocked(prisma.liveClass.groupBy).mockResolvedValue([]);
});

it('keeps unrelated course filters empty and always enforces enrollment and batch membership', async () => {
  await getLearnerLiveClasses('learner', { courseId: 'unrelated' });
  const query = vi.mocked(prisma.liveClassSession.findMany).mock.calls[0][0]!;
  expect(query.where?.liveClass).toEqual({ AND: [
    { courseId: { in: ['allowed'] }, OR: [{ batchId: null }, { batch: { status: 'ACTIVE', memberships: { some: { userId: 'learner', status: 'ACTIVE' } } } }] },
    { courseId: 'unrelated' },
  ] });
});

it('excludes expired upcoming and missed sessions from the active feed without dropping live sessions', async () => {
  await getLearnerLiveClasses('learner');
  const where = vi.mocked(prisma.liveClassSession.findMany).mock.calls[0][0]!.where!;
  expect(where.OR).toEqual([{ status: 'LIVE' }, { status: 'UPCOMING', scheduledEnd: { gt: expect.any(Date) } }]);
});

it('makes expired upcoming sessions available in missed history', async () => {
  await getLearnerLiveClasses('learner', { scope: 'missed' });
  const where = vi.mocked(prisma.liveClassSession.findMany).mock.calls[0][0]!.where!;
  expect(where.OR).toEqual([{ status: 'MISSED' }, { status: 'UPCOMING', scheduledEnd: { lte: expect.any(Date) } }]);
});

it('rejects invalid date filters before querying sessions', async () => {
  await expect(getLearnerLiveClasses('learner', { dateFrom: 'invalid' })).rejects.toThrow('valid date range');
  await expect(getLearnerLiveClasses('learner', { dateFrom: '2026-09-08', dateTo: '2026-09-07' })).rejects.toThrow('valid date range');
  expect(prisma.liveClassSession.findMany).not.toHaveBeenCalled();
});

it('normalizes fractional and unbounded page sizes', async () => {
  await getLearnerLiveClasses('learner', { pageSize: 1.5 });
  expect(prisma.liveClassSession.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 2 }));
  await getLearnerLiveClasses('learner', { pageSize: Infinity });
  expect(prisma.liveClassSession.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 21 }));
});
