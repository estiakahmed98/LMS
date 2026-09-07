/** Browsers throttle background timers, especially on mobile devices. */
export function subscribeNotificationRefresh(refresh: () => void) {
  const resume = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) refresh();
  };
  const timer = window.setInterval(resume, 15_000);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  window.addEventListener('notifications-updated', resume);
  document.addEventListener('visibilitychange', resume);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', resume);
    window.removeEventListener('online', resume);
    window.removeEventListener('notifications-updated', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
