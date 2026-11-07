import { describe, expect, it } from "vitest";
import { byTag, equityCurve, maxDrawdown, summarize, winRate, type StatsTrade } from "./stats";

let n = 0;
/** A long trade with a chosen net P&L: entry 100, exit 100 + net, qty 1, no fees. */
function trade(net: number, opts: Partial<StatsTrade> & { minute?: number } = {}): StatsTrade {
  n++;
  const { minute = n, ...rest } = opts;
  return {
    id: `t${String(n).padStart(3, "0")}`,
    side: "long",
    entryPrice: "100",
    exitPrice: String(100 + net),
    quantity: "1",
    fees: "0",
    currency: "INR",
    tags: [],
    exitAt: new Date(Date.UTC(2026, 9, 5, 4, minute)),
    ...rest,
  };
}

describe("F5.2 win rate (D3)", () => {
  it("F5.2 wins / (wins + losses)", () => {
    expect(winRate([trade(10), trade(5), trade(-3)])).toBeCloseTo(2 / 3);
  });
  it("F5.2 breakevens are excluded from the rate", () => {
    expect(winRate([trade(10), trade(-3), trade(0), trade(0)])).toBeCloseTo(0.5);
  });
  it('F5.2 is null ("n/a") with no wins and no losses, not 0', () => {
    expect(winRate([])).toBeNull();
    expect(winRate([trade(0), trade(0)])).toBeNull();
  });
  it("F5.2 is 0 when there are only losses", () => {
    expect(winRate([trade(-1), trade(-2)])).toBe(0);
  });
});

describe("F5.3 max drawdown (D5)", () => {
  it("F5.3 all wins → 0", () => {
    expect(maxDrawdown([trade(10), trade(20), trade(5)])).toBe(0);
  });
  it("F5.3 all losses → sum of losses (peak starts at 0)", () => {
    expect(maxDrawdown([trade(-10), trade(-20), trade(-5)])).toBeCloseTo(35);
  });
  it("F5.3 a peak, then a deeper trough later", () => {
    // cumulative: 50, 20, 70, 10, 40 → peak 70, trough 10 → 60
    expect(maxDrawdown([trade(50), trade(-30), trade(50), trade(-60), trade(30)])).toBeCloseTo(60);
  });
  it("F5.3 uses exit-time order, not input order", () => {
    // Exit order: −20, +100, −50 → cumulative −20, 80, 30 → drawdown 50.
    // Input order would be +100, −50, −20 → 100, 50, 30 → 70, so the order matters here.
    const first = trade(-20, { minute: 10 });
    const second = trade(100, { minute: 30 });
    const third = trade(-50, { minute: 50 });
    expect(maxDrawdown([second, third, first])).toBeCloseTo(50);
  });
  it("F5.3 ties in exit time are broken by id", () => {
    // Same exit time. Id order: a(+100), b(−50), c(−80) → 100, 50, −30 → drawdown 130.
    // Input order b, a, c would give −50, 50, −30 → 80, so the tie-break matters here.
    const b = trade(-50, { id: "b", minute: 0 });
    const a = trade(100, { id: "a", minute: 0 });
    const c = trade(-80, { id: "c", minute: 0 });
    expect(equityCurve([b, a, c]).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(maxDrawdown([b, a, c])).toBeCloseTo(130);
  });
  it("F5.3 is 0 for no trades", () => {
    expect(maxDrawdown([])).toBe(0);
  });
});

describe("F5.4 summarize", () => {
  it("F5.4 gives every field, per currency, sorted by code", () => {
    const rows = [
      trade(10, { fees: "1", exitPrice: "111" }), // gross 11, net 10
      trade(-4),
      trade(0),
      trade(6, { currency: "USD" }),
    ];
    const [inr, usd] = summarize(rows);
    expect(inr).toMatchObject({ currency: "INR", trades: 3, wins: 1, losses: 1, breakevens: 1 });
    expect(inr.winRate).toBeCloseTo(0.5);
    expect(inr.gross).toBeCloseTo(7);
    expect(inr.fees).toBeCloseTo(1);
    expect(inr.net).toBeCloseTo(6);
    expect(inr.averageWin).toBeCloseTo(10);
    expect(inr.averageLoss).toBeCloseTo(-4);
    expect(inr.largestWin).toBeCloseTo(10);
    expect(inr.largestLoss).toBeCloseTo(-4);
    expect(inr.maxDrawdown).toBeCloseTo(4);
    expect(usd).toMatchObject({ currency: "USD", trades: 1, wins: 1, losses: 0, averageLoss: null, largestLoss: null });
  });
  it("F5.4 never adds different currencies together (D6)", () => {
    const totals = summarize([trade(100), trade(1, { currency: "USD" })]).map((s) => s.net);
    expect(totals).toHaveLength(2);
    expect(totals[0]).toBeCloseTo(100);
    expect(totals[1]).toBeCloseTo(1);
  });
  it("F5.4 returns an empty list for no trades", () => {
    expect(summarize([])).toEqual([]);
  });
});

describe("F5.5 byTag", () => {
  it("F5.5 counts a multi-tag trade under each tag, per currency, worst first", () => {
    const rows = byTag([
      trade(-20, { tags: ["revenge-trade", "oversized"] }),
      trade(5, { tags: ["oversized"] }),
      trade(8),
      trade(-3, { currency: "USD", tags: ["oversized"] }),
    ]);
    expect(rows.map((r) => [r.currency, r.tag, r.count])).toEqual([
      ["INR", "revenge-trade", 1],
      ["INR", "oversized", 2],
      ["INR", null, 1],
      ["USD", "oversized", 1],
    ]);
    const oversizedInr = rows.find((r) => r.currency === "INR" && r.tag === "oversized")!;
    expect(oversizedInr.net).toBeCloseTo(-15);
    expect(oversizedInr.winRate).toBeCloseTo(0.5);
  });
  it("F5.5 reports untagged trades separately with tag = null", () => {
    expect(byTag([trade(1)])).toEqual([{ tag: null, currency: "INR", count: 1, net: 1, winRate: 1 }]);
  });
});
