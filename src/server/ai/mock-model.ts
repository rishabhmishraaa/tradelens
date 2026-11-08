// F7.8 / D14: a fake model for tests. Never calls the network. Each scenario covers one path.
import type { ReviewModel } from "./generate";
import type { ReviewInput } from "./review-input";
import type { Review } from "./review-schema";

export const MOCK_SCENARIOS = ["valid", "invalid-then-valid", "invalid-json", "schema", "grounding", "api-error"] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];
export const MOCK_MODEL_NAME = "mock-model";

/** A review that passes the schema and every grounding check for the given input. */
export function groundedReview(input: ReviewInput): Review {
  const tags = [...new Set(input.trades.flatMap((t) => t.mistakeTags))];
  return {
    summary: `Mock review of ${input.sessionDate}: ${input.trades.length} trade(s).`,
    wentWell: input.trades.some((t) => t.result === "win") ? ["At least one trade followed the plan."] : [],
    mistakes: tags.map((tag) => ({
      tag: tag as Review["mistakes"][number]["tag"],
      tradeIds: input.trades.filter((t) => t.mistakeTags.includes(tag)).map((t) => t.id),
      insight: `Mock insight about ${tag}.`,
    })),
    patterns: [],
    nextSessionFocus: "Mock focus: wait for the setup.",
  };
}

export function createMockModel(scenario: MockScenario = "valid"): ReviewModel {
  let calls = 0;
  return {
    name: MOCK_MODEL_NAME,
    async generate(input) {
      calls++;
      switch (scenario) {
        case "valid":
          return JSON.stringify(groundedReview(input));
        case "invalid-then-valid":
          return calls === 1 ? "Sure! Here is your review: {" : JSON.stringify(groundedReview(input));
        case "invalid-json":
          return "Sure! Here is your review: {";
        case "schema":
          return JSON.stringify({ ...groundedReview(input), summary: "" });
        case "grounding":
          return JSON.stringify({ ...groundedReview(input), mistakes: [{ tag: "other", tradeIds: ["not-a-real-id"], insight: "x" }] });
        case "api-error":
          throw new Error("Mock API error (529 overloaded)");
      }
    },
  };
}
