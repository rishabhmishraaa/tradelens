import type { Outcome } from "./stats";

/** Money with an explicit sign, e.g. "+₹1,234.50" / "−$12.00" / "₹0.00". Rounded only here (D7). */
export function formatSignedMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const abs = new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(
    Math.abs(rounded),
  );
  if (rounded > 0) return `+${abs}`;
  if (rounded < 0) return `−${abs}`; // true minus sign
  return abs;
}

/** Money without a forced sign, e.g. "₹6,142.20" (for drawdown and fees, which are always ≥ 0). */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(
    Math.round(amount * 100) / 100,
  );
}

/** D3: win rate as "51.6%", or "n/a" when undefined. */
export function formatPercent(rate: number | null): string {
  return rate === null ? "n/a" : `${(Math.round(rate * 1000) / 10).toFixed(1)}%`;
}

/**
 * "2026-10-05" → "Mon, 05 Oct 2026". Built from en-US parts so the result doesn't depend on
 * locale punctuation ("05 Oct, 2026" in en-IN) or abbreviations ("Sept" in en-GB).
 */
export function formatSessionDate(date: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** F4.5: colour is never the only signal, so every result also has a text label. */
export const OUTCOME_LABEL: Record<Outcome, string> = { win: "Win", loss: "Loss", breakeven: "Breakeven" };

export const OUTCOME_CLASS: Record<Outcome, string> = {
  win: "text-emerald-700 dark:text-emerald-400",
  loss: "text-red-700 dark:text-red-400",
  breakeven: "text-neutral-700 dark:text-neutral-300",
};

/** Trims trailing zeros from Postgres numeric strings: "1412.50000000" → "1412.5". */
export function formatDecimal(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
