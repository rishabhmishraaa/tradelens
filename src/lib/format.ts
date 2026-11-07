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

/** F4.5: colour is never the only signal, so every result also has a text label. */
export const OUTCOME_LABEL: Record<Outcome, string> = { win: "Win", loss: "Loss", breakeven: "Breakeven" };

export const OUTCOME_CLASS: Record<Outcome, string> = {
  win: "text-emerald-700 dark:text-emerald-400",
  loss: "text-red-700 dark:text-red-400",
  breakeven: "text-neutral-600 dark:text-neutral-400",
};

/** Trims trailing zeros from Postgres numeric strings: "1412.50000000" → "1412.5". */
export function formatDecimal(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
