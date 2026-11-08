import { describe, expect, it } from "vitest";
import { groundingProblems, reviewSchema, type Review } from "./review-schema";

const trades = [
  { id: "t1", tags: ["fomo-entry", "chased-price"] },
  { id: "t2", tags: ["revenge-trade"] },
  { id: "t3", tags: [] },
];

const good: Review = {
  summary: "Two impulsive trades.",
  wentWell: ["t3 followed the plan"],
  mistakes: [
    { tag: "fomo-entry", tradeIds: ["t1"], insight: "Entered late." },
    { tag: "chased-price", tradeIds: ["t1"], insight: "Chased." },
    { tag: "revenge-trade", tradeIds: ["t2"], insight: "Revenge." },
  ],
  patterns: [],
  nextSessionFocus: "Wait for the setup.",
};

describe("F7.2 review schema", () => {
  it("F7.2 accepts a valid review", () => {
    expect(reviewSchema.safeParse(good).success).toBe(true);
  });
  it("F7.2 enforces lengths, counts and the tag list", () => {
    expect(reviewSchema.safeParse({ ...good, summary: "" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...good, summary: "x".repeat(601) }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...good, wentWell: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...good, mistakes: [{ tag: "bad-luck", tradeIds: ["t1"], insight: "x" }] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...good, mistakes: [{ tag: "other", tradeIds: [], insight: "x" }] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...good, nextSessionFocus: undefined }).success).toBe(false);
  });
});

describe("F7.3 grounding checks", () => {
  it("F7.3 a grounded review has no problems", () => {
    expect(groundingProblems(good, trades)).toEqual([]);
  });
  it("F7.3 rejects a trade id that isn't in the day's input", () => {
    const review = { ...good, mistakes: [...good.mistakes, { tag: "other" as const, tradeIds: ["t9"], insight: "x" }] };
    expect(groundingProblems(review, trades)).toEqual(["unknown trade id t9"]);
  });
  it("F7.3 rejects a day's tag that is missing from mistakes", () => {
    const review = { ...good, mistakes: good.mistakes.filter((m) => m.tag !== "revenge-trade") };
    expect(groundingProblems(review, trades)).toEqual(["tag revenge-trade is missing from mistakes"]);
  });
  it("F7.3 rejects a trade listed under a tag it doesn't have", () => {
    const review = { ...good, mistakes: [...good.mistakes, { tag: "oversized" as const, tradeIds: ["t2"], insight: "x" }] };
    expect(groundingProblems(review, trades)).toEqual(["trade t2 is not tagged oversized"]);
  });
  it('F7.3 "other" may list any real trade', () => {
    const review = { ...good, mistakes: [...good.mistakes, { tag: "other" as const, tradeIds: ["t3"], insight: "Notes mention boredom." }] };
    expect(groundingProblems(review, trades)).toEqual([]);
  });
});
