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

// ---------------------------------------------------------------------------
// Aggregates (F5.2–F5.5). All per currency: currencies are never mixed (D6).

export type StatsTrade = PnlInput & { id: string; exitAt: Date; currency: string; tags: string[] };

/** D3: wins / (wins + losses). Breakevens excluded. null ("n/a") when there are no wins or losses. */
export function winRate(trades: PnlInput[]): number | null {
  let wins = 0;
  let losses = 0;
  for (const t of trades) {
    const o = outcome(netPnl(t));
    if (o === "win") wins++;
    else if (o === "loss") losses++;
  }
  return wins + losses === 0 ? null : wins / (wins + losses);
}

/** Exit time ascending, ties broken by id (D5), without mutating the input. */
export function byExitTime<T extends { exitAt: Date; id: string }>(trades: T[]): T[] {
  return [...trades].sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * D5: largest fall from a running peak of cumulative net P&L, peak starting at 0.
 * Non-negative, in the trades' currency. Pass trades of ONE currency only.
 */
export function maxDrawdown(trades: StatsTrade[]): number {
  let cumulative = 0;
  let peak = 0;
  let worst = 0;
  for (const t of byExitTime(trades)) {
    cumulative += netPnl(t);
    peak = Math.max(peak, cumulative);
    worst = Math.max(worst, peak - cumulative);
  }
  return worst;
}

/** Cumulative net P&L after each trade, in exit order (for the equity curve, F6.1). */
export function equityCurve(trades: StatsTrade[]): { id: string; exitAt: Date; cumulative: number }[] {
  let cumulative = 0;
  return byExitTime(trades).map((t) => {
    cumulative += netPnl(t);
    return { id: t.id, exitAt: t.exitAt, cumulative };
  });
}

export type CurrencySummary = {
  currency: string;
  trades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null;
  gross: number;
  fees: number;
  net: number;
  /** Mean net of winning trades (positive), null if none. */
  averageWin: number | null;
  /** Mean net of losing trades (negative), null if none. */
  averageLoss: number | null;
  /** Best single trade (positive), null if no wins. */
  largestWin: number | null;
  /** Worst single trade (negative), null if no losses. */
  largestLoss: number | null;
  maxDrawdown: number;
};

export function groupByCurrency<T extends { currency: string }>(trades: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const t of trades) groups.set(t.currency, [...(groups.get(t.currency) ?? []), t]);
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** F5.4: one summary per currency, sorted by currency code. */
export function summarize(trades: StatsTrade[]): CurrencySummary[] {
  return [...groupByCurrency(trades)].map(([currency, group]) => {
    const nets = group.map(netPnl);
    const winNets = nets.filter((n) => outcome(n) === "win");
    const lossNets = nets.filter((n) => outcome(n) === "loss");
    return {
      currency,
      trades: group.length,
      wins: winNets.length,
      losses: lossNets.length,
      breakevens: group.length - winNets.length - lossNets.length,
      winRate: winRate(group),
      gross: group.reduce((s, t) => s + grossPnl(t), 0),
      fees: group.reduce((s, t) => s + Number(t.fees), 0),
      net: nets.reduce((s, n) => s + n, 0),
      averageWin: mean(winNets),
      averageLoss: mean(lossNets),
      largestWin: winNets.length ? Math.max(...winNets) : null,
      largestLoss: lossNets.length ? Math.min(...lossNets) : null,
      maxDrawdown: maxDrawdown(group),
    };
  });
}

export type TagRow = { tag: string | null; currency: string; count: number; net: number; winRate: number | null };

/**
 * F5.5: per mistake tag and currency. A trade with two tags counts under both.
 * Untagged trades are reported with tag = null. Sorted by currency, then worst net first.
 */
export function byTag(trades: StatsTrade[]): TagRow[] {
  const groups = new Map<string, { tag: string | null; currency: string; trades: StatsTrade[] }>();
  for (const t of trades) {
    for (const tag of t.tags.length ? t.tags : [null]) {
      const key = `${t.currency}|${tag ?? ""}`;
      const g = groups.get(key) ?? { tag, currency: t.currency, trades: [] };
      g.trades.push(t);
      groups.set(key, g);
    }
  }
  return [...groups.values()]
    .map((g) => ({
      tag: g.tag,
      currency: g.currency,
      count: g.trades.length,
      net: g.trades.reduce((s, t) => s + netPnl(t), 0),
      winRate: winRate(g.trades),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency) || a.net - b.net);
}
