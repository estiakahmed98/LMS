export const STARTING_SOON_WINDOW_MS = 15 * 60 * 1000;

export function isSessionStartingSoon(
  scheduledStart: string | Date,
  status: string,
  now: Date,
): boolean {
  if (status !== "UPCOMING") return false;
  const delta = new Date(scheduledStart).getTime() - now.getTime();
  return delta > 0 && delta <= STARTING_SOON_WINDOW_MS;
}

export function minutesUntilSessionStart(
  scheduledStart: string | Date,
  now: Date,
): number {
  return Math.max(
    1,
    Math.ceil((new Date(scheduledStart).getTime() - now.getTime()) / 60000),
  );
}
