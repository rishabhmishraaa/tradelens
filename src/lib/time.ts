// D4: the app works in IST (Asia/Kolkata). IST is a fixed UTC+05:30 with no daylight saving,
// so conversion is a fixed offset. Never rely on the server's own time zone (Vercel runs in UTC).
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // <input type="datetime-local"> value
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-05T09:20" (IST) → Date (UTC instant). Returns null for anything that isn't a real time. */
export function istInputToUtc(value: string): Date | null {
  if (!INPUT_PATTERN.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible values such as 2026-02-31 that JS would silently roll over.
  return utcToIstInput(date) === value ? date : null;
}

/** Date (UTC instant) → "2026-10-05T09:20" in IST, for an edit form's datetime-local input. */
export function utcToIstInput(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** D4 / F5.6: the trading session (IST calendar date) a trade belongs to, from its exit time. */
export function sessionDate(exitAt: Date): string {
  return utcToIstInput(exitAt).slice(0, 10);
}

/** UTC range [start, end) covering IST calendar dates from..to inclusive. Null if a date is invalid. */
export function istDateRangeToUtc(from: string, to: string): { start: Date; end: Date } | null {
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return null;
  const start = istInputToUtc(`${from}T00:00`);
  const toStart = istInputToUtc(`${to}T00:00`);
  if (!start || !toStart) return null;
  return { start, end: new Date(toStart.getTime() + 24 * 60 * 60 * 1000) };
}

/** Readable IST date-time for tables, e.g. "05 Oct 2026, 09:20". */
export function formatIst(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
