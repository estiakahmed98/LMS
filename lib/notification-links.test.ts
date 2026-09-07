import { describe, expect, it } from 'vitest';
import { notificationInboxPath, safeNotificationAction } from './notification-links';

describe('notification links', () => {
  it('routes each portal to its inbox', () => {
    expect(notificationInboxPath('/api/learner/notifications')).toBe('/notifications');
    expect(notificationInboxPath('/api/instructor/notifications')).toBe('/instructor/notifications');
    expect(notificationInboxPath('/api/admin/notifications')).toBe('/admin/notifications');
  });
  it('only allows local paths without browser URL normalization hazards', () => {
    for (const value of [null, '//evil.test', '/\\evil.test', 'javascript:alert(1)', 'https://evil.test', '/\nevil.test']) expect(safeNotificationAction(value)).toBeNull();
    expect(safeNotificationAction('/courses/abc?tab=modules')).toBe('/courses/abc?tab=modules');
  });
});
