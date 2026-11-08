import { describe, expect, it } from "vitest";
import { sessionDate } from "@/lib/time";
import { groundingProblems, reviewSchema } from "@/server/ai/review-schema";
import { demoReviews } from "./demo-reviews";
import { demoTrades } from "./seed-data";

// F8.3: the pre-generated demo reviews must pass exactly the checks live AI output must pass.
const sessions = [...new Set(demoTrades().map((t) => sessionDate(t.exitAt)))].sort();

describe("F8.3 pre-generated demo reviews", () => {
  it("F8.3 every demo session has a review, and there are no extra ones", () => {
    expect(Object.keys(demoReviews).sort()).toEqual(sessions);
  });

  for (const date of sessions) {
    it(`F8.3 ${date}: schema-valid and grounded in that day's trades`, () => {
      const parsed = reviewSchema.safeParse(demoReviews[date]);
      expect(parsed.success, parsed.success ? "" : parsed.error.issues[0]?.message).toBe(true);
      const dayTrades = demoTrades().filter((t) => sessionDate(t.exitAt) === date);
      expect(groundingProblems(demoReviews[date], dayTrades)).toEqual([]);
    });
  }
});
