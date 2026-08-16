export function normalizeCohortCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function cohortCodeFromName(name: string, year = new Date().getFullYear()) {
  const stem = normalizeCohortCode(name).slice(0, 20) || "COHORT";
  return `${stem}-${year}`;
}
