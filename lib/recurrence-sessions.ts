import type { RecurrencePatternValue } from "@/lib/admin-class-types";

export function defaultRecurrenceCount(recurrence: RecurrencePatternValue): number {
  switch (recurrence) {
    case "DAILY":
      return 14;
    case "WEEKLY":
      return 8;
    case "MONTHLY":
      return 6;
    default:
      return 1;
  }
}

function advanceRecurrence(date: Date, recurrence: RecurrencePatternValue): Date {
  const next = new Date(date);
  switch (recurrence) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }
  return next;
}

export function buildRecurringSessionTimes(params: {
  recurrence: RecurrencePatternValue;
  scheduledStart: Date;
  durationMinutes: number;
  count?: number;
}): Array<{ scheduledStart: Date; scheduledEnd: Date }> {
  const count = params.count ?? defaultRecurrenceCount(params.recurrence);
  const durationMs = params.durationMinutes * 60_000;

  if (params.recurrence === "NONE" || count <= 1) {
    return [
      {
        scheduledStart: params.scheduledStart,
        scheduledEnd: new Date(params.scheduledStart.getTime() + durationMs),
      },
    ];
  }

  const sessions: Array<{ scheduledStart: Date; scheduledEnd: Date }> = [];
  let current = new Date(params.scheduledStart);

  for (let index = 0; index < count; index += 1) {
    sessions.push({
      scheduledStart: new Date(current),
      scheduledEnd: new Date(current.getTime() + durationMs),
    });
    current = advanceRecurrence(current, params.recurrence);
  }

  return sessions;
}
