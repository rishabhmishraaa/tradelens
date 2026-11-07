import { describe, expect, it } from "vitest";
import { grossPnl, netPnl, outcome } from "./stats";

const base = { entryPrice: "100", exitPrice: "110", quantity: "10", fees: "5" };

describe("F5.1 net P&L (D2)", () => {
  it("F5.1 long: (exit − entry) × qty − fees", () => {
    expect(grossPnl({ ...base, side: "long" })).toBeCloseTo(100);
    expect(netPnl({ ...base, side: "long" })).toBeCloseTo(95);
  });

  it("F5.1 short: (entry − exit) × qty − fees", () => {
    expect(grossPnl({ ...base, side: "short" })).toBeCloseTo(-100);
    expect(netPnl({ ...base, side: "short" })).toBeCloseTo(-105);
  });

  it("F5.1 a profitable short when price falls", () => {
    expect(netPnl({ side: "short", entryPrice: "304.50", exitPrice: "298.20", quantity: "20", fees: "2" })).toBeCloseTo(124);
  });

  it("F5.1 fees can turn a small gross win into a loss", () => {
    expect(netPnl({ side: "long", entryPrice: "1895", exitPrice: "1896", quantity: "10", fees: "12" })).toBeCloseTo(-2);
  });

  it("F5.1 handles fractional quantities and prices", () => {
    expect(netPnl({ side: "long", entryPrice: "0.00001234", exitPrice: "0.00001334", quantity: "1000000", fees: "0" })).toBeCloseTo(1);
  });
});

describe("D3 outcome", () => {
  it("D3 classifies win, loss and exact breakeven (ignoring float noise)", () => {
    expect(outcome(0.01)).toBe("win");
    expect(outcome(-0.01)).toBe("loss");
    expect(outcome(0)).toBe("breakeven");
    expect(outcome(netPnl({ side: "long", entryPrice: "1150.00", exitPrice: "1151.00", quantity: "30", fees: "30.00" }))).toBe("breakeven");
    expect(outcome(1e-12)).toBe("breakeven");
  });
});
