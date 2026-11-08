import { describe, expect, it } from "vitest";
import { demoTrades } from "@/db/seed-data";
import { sessionDate } from "@/lib/time";
import { buildReviewInput, SYSTEM_PROMPT, userMessage } from "./review-input";

const day = "2026-10-09"; // FOMO, revenge and oversized trades
const trades = demoTrades().filter((t) => sessionDate(t.exitAt) === day);

describe("F7.1 prompt input", () => {
  it("F7.1 is built from the day's trades and code-computed stats (snapshot)", () => {
    expect(buildReviewInput(day, trades)).toMatchSnapshot();
  });

  it("F7.1 contains every trade id and tag, and the stats from summarize/byTag", () => {
    const input = buildReviewInput(day, trades);
    expect(input.trades.map((t) => t.id).sort()).toEqual(trades.map((t) => t.id).sort());
    expect(input.trades.find((t) => t.symbol === "TATAMOTORS" && t.mistakeTags.includes("revenge-trade"))?.netPnl).toBe(-2030);
    expect(input.stats).toHaveLength(1);
    expect(input.stats[0]).toMatchObject({ currency: "INR", trades: 5, wins: 1, losses: 4 });
    expect(input.byMistake.map((m) => m.tag)).toContain("revenge-trade");
  });

  it("F7.1 the prompt tells the model not to calculate and to stay grounded (D9)", () => {
    expect(SYSTEM_PROMPT).toMatch(/Do not calculate any numbers/);
    expect(SYSTEM_PROMPT).toMatch(/Use the exact trade ids/);
    expect(userMessage(buildReviewInput(day, trades))).toContain("<session>");
  });
});
