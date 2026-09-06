export type ScheduledInterval = { scheduledStart: Date; scheduledEnd: Date };
export type ClassScheduleConflictField = "courseId" | "instructorId" | "scheduledStart";

export class ClassScheduleConflictError extends Error {
  constructor(
    message: string,
    public readonly fields: ClassScheduleConflictField[] = ["scheduledStart"],
  ) {
    super(message);
    this.name = "ClassScheduleConflictError";
  }
}

export function intervalsOverlap(a: ScheduledInterval, b: ScheduledInterval) {
  return a.scheduledStart < b.scheduledEnd && a.scheduledEnd > b.scheduledStart;
}
