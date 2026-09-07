import { notificationJson } from '@/lib/notification-http';
import { requireActiveUser, RbacError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/notification-server';

export async function GET(request: Request) {
  try {
    const user = await requireActiveUser();
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const category = params.get('category');
    const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1));
    const where = {
      userId: user.id,
      ...(id ? { id } : {}),
      ...(params.get('unread') === 'true' ? { readAt: null } : {}),
      ...(category === 'announcement' ? { campaignId: { not: null } } : category === 'event' ? { campaignId: null } : {}),
    };
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (Math.floor(page) - 1) * 20, take: 20 }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return notificationJson({ notifications, total, unreadCount });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    if (body?.markAll === true) await markAllNotificationsRead(user.id);
    else if (typeof body?.notificationId === 'string' && body.notificationId.length > 0) await markNotificationRead(user.id, body.notificationId);
    else return notificationJson({ error: 'notificationId is required.' }, { status: 400 });
    return notificationJson({ ok: true });
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  if (error instanceof RbacError) return notificationJson({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return notificationJson({ error: 'Invalid JSON.' }, { status: 400 });
  if (error instanceof Error && error.message === 'Notification not found.') return notificationJson({ error: error.message }, { status: 404 });
  console.error('NOTIFICATION_INBOX_ERROR', error);
  return notificationJson({ error: 'Unable to load or update notifications.' }, { status: 500 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
