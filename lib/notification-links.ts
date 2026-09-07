export function notificationInboxPath(apiPath: string) {
  if (apiPath.includes('/admin/')) return '/admin/notifications';
  if (apiPath.includes('/instructor/')) return '/instructor/notifications';
  return '/notifications';
}

export function safeNotificationAction(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  if ([...value].some(char => char === '\\' || char.charCodeAt(0) <= 32)) return null;
  return value;
}
