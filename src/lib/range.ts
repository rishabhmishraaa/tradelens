// F6.1: the dashboard's default date range.
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Adds days to an ISO calendar date ("2026-10-19", -29) → "2026-09-20". */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export const isIsoDate = (value: string) =>
  DATE_PATTERN.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/**
 * The 30 days (inclusive) ending at the most recent trade's session date, or ending today when there
 * are no trades. Anchoring to the last trade (not today) keeps the dashboard useful when trades are
 * old, e.g. the fixed demo data, which would otherwise show an empty "last 30 days" weeks later.
 */
export function defaultRange(latestSession: string | null, today: string): { from: string; to: string } {
  const to = latestSession ?? today;
  return { from: addDays(to, -29), to };
}
