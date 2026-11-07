// F5: P&L and stats as pure functions. No database or framework imports.
// D7: values arrive as numeric strings from Postgres; calculations use JS numbers,
// rounding happens only when displayed.

export type PnlInput = {
  side: "long" | "short";
  entryPrice: string | number;
  exitPrice: string | number;
  quantity: string | number;
  fees: string | number;
};

export type Outcome = "win" | "loss" | "breakeven";

/** D2: long = (exit − entry) × qty; short = (entry − exit) × qty; net = gross − fees. */
export function grossPnl(t: PnlInput): number {
  const move = Number(t.exitPrice) - Number(t.entryPrice);
  return (t.side === "long" ? move : -move) * Number(t.quantity);
}

export function netPnl(t: PnlInput): number {
  return grossPnl(t) - Number(t.fees);
}

/**
 * D3: win > 0, loss < 0, breakeven = 0. Compared after rounding to 8 decimals (the DB scale),
 * so float noise like 1e-13 from (1151 − 1150) × 30 − 30 still counts as breakeven.
 */
export function outcome(net: number): Outcome {
  const rounded = Math.round(net * 1e8) / 1e8;
  if (rounded > 0) return "win";
  if (rounded < 0) return "loss";
  return "breakeven";
}
