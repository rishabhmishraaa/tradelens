import { describe, expect, it } from "vitest";
import { demoTrades } from "@/db/seed-data";
import fixture from "./__fixtures__/seed-stats.json";
import { byTag, summarize } from "./stats";

// F5.7: the fixture was generated once from the seed data, then checked by hand
// (e.g. USD net +450 with 7 wins / 5 losses; USD drawdown 210 = peak 482 → 272;
// INR largest loss −2030 = TATAMOTORS 400 × (698.10 − 703) − 70) and against SQL (stats.int.test.ts).
const expectClose = (actual: Record<string, unknown>, expected: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "number") expect(actual[key], key).toBeCloseTo(value, 5);
    else expect(actual[key], key).toEqual(value);
  }
};

describe("F5.7 stats on the seed data match the committed fixture", () => {
  it("F5.7 summarize", () => {
    const summary = summarize(demoTrades());
    expect(summary).toHaveLength(fixture.summary.length);
    summary.forEach((row, i) => expectClose(row, fixture.summary[i]));
  });

  it("F5.7 byTag", () => {
    const rows = byTag(demoTrades());
    expect(rows).toHaveLength(fixture.byTag.length);
    rows.forEach((row, i) => expectClose(row, fixture.byTag[i]));
  });
});
