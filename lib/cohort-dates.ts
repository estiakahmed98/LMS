export function cohortToday(timezone = "Asia/Dhaka", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function cohortEndDateMin(start: string | null, today: string) {
  if (!start || start < today) return today;
  const next = new Date(`${start.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(next.getTime())) return today;
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function validateNewCohortDates(start: string | null, end: string | null, timezone = "Asia/Dhaka") {
  let today: string;
  try { today = cohortToday(timezone); }
  catch { throw new Error("Please select a valid timezone."); }
  for (const [label, value] of [["Start date", start], ["End date", end]]) {
    if (!value) continue;
    const day = value.slice(0, 10);
    const parsed = new Date(`${day}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
      throw new Error(`${label} is invalid.`);
    }
    if (day < today) throw new Error(`${label} cannot be in the past. Please select today or a future date.`);
  }
  if (start && end && end.slice(0, 10) <= start.slice(0, 10)) {
    throw new Error("End date must be after the start date.");
  }
}
