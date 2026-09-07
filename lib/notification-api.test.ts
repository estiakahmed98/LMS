import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/rbac', () => ({
  requireActiveUser: vi.fn(),
  RbacError: class extends Error { constructor(message: string, public status: number) { super(message); } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() } } }));
import { requireActiveUser, RbacError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { GET, PATCH } from '@/app/api/notifications/route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireActiveUser).mockResolvedValue({ id: 'current-user', role: 'STUDENT' });
  vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
  vi.mocked(prisma.notification.count).mockResolvedValue(0);
  vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 });
});

it('scopes detail and filtered lists to the authenticated recipient', async () => {
  await GET(new Request('https://lms.test/api/notifications?id=someone-elses-id&userId=other&category=event&unread=true'));
  expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'someone-elses-id', userId: 'current-user', campaignId: null, readAt: null } }));
});

it('cannot mark another recipient notification as read', async () => {
  const res = await PATCH(new Request('https://lms.test/api/notifications', { method: 'PATCH', body: JSON.stringify({ notificationId: 'foreign', userId: 'other' }) }));
  expect(res.status).toBe(404);
  expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', userId: 'current-user' } }));
});

it('marks only the current user unread notifications', async () => {
  const res = await PATCH(new Request('https://lms.test/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) }));
  expect(res.status).toBe(200);
  expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'current-user', readAt: null } }));
});

it('rejects unauthenticated users before accessing notification data', async () => {
  vi.mocked(requireActiveUser).mockRejectedValue(new RbacError('Authentication required.', 401));
  expect((await GET(new Request('https://lms.test/api/notifications'))).status).toBe(401);
  expect(prisma.notification.findMany).not.toHaveBeenCalled();
});

it('rejects malformed read requests', async () => {
  for (const body of ['{', '{}', '{"notificationId":123}']) {
    expect((await PATCH(new Request('https://lms.test/api/notifications', { method: 'PATCH', body }))).status).toBe(400);
  }
});
