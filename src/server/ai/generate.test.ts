import { describe, expect, it } from "vitest";
import { demoTrades } from "@/db/seed-data";
import { sessionDate } from "@/lib/time";
import { generateReview, type ReviewModel } from "./generate";
import { createMockModel, groundedReview } from "./mock-model";
import { buildReviewInput } from "./review-input";

const day = "2026-10-09";
const input = buildReviewInput(day, demoTrades().filter((t) => sessionDate(t.exitAt) === day));

/** A fake model that returns the given responses in order and counts calls. */
function scripted(...responses: (string | Error)[]) {
  const model: ReviewModel & { calls: number } = {
    name: "scripted",
    calls: 0,
    async generate() {
      const next = responses[model.calls++];
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return model;
}
const valid = JSON.stringify(groundedReview(input));

describe("F7.4 invalid output: one retry, then a safe failure", () => {
  it("F7.4 valid first time → 1 call", async () => {
    const model = scripted(valid);
    expect(await generateReview(model, input)).toMatchObject({ ok: true, attempts: 1 });
    expect(model.calls).toBe(1);
  });
  it("F7.4 invalid JSON then valid → succeeds on the retry", async () => {
    const model = scripted("not json", valid);
    expect(await generateReview(model, input)).toMatchObject({ ok: true, attempts: 2 });
  });
  it("F7.4 invalid twice → error 'invalid' after exactly 2 calls", async () => {
    const model = scripted("not json", "{}", valid);
    expect(await generateReview(model, input)).toMatchObject({ ok: false, error: "invalid", attempts: 2 });
    expect(model.calls).toBe(2);
  });
  it("F7.4 schema failures and grounding failures count as invalid", async () => {
    for (const scenario of ["schema", "grounding", "invalid-json"] as const) {
      const result = await generateReview(createMockModel(scenario), input);
      expect(result, scenario).toMatchObject({ ok: false, error: "invalid", attempts: 2 });
    }
  });
});

describe("F7.5 API errors and timeouts", () => {
  it("F7.5 an API error fails immediately without a retry", async () => {
    const model = scripted(new Error("529 overloaded"), valid);
    expect(await generateReview(model, input)).toMatchObject({ ok: false, error: "api", attempts: 1 });
    expect(model.calls).toBe(1);
  });
  it("F7.5 a slow model times out and its request is aborted", async () => {
    let aborted = false;
    const slow: ReviewModel = {
      name: "slow",
      generate: (_input, signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => (aborted = true));
          setTimeout(() => resolve(valid), 500);
        }),
    };
    expect(await generateReview(slow, input, 50)).toMatchObject({ ok: false, error: "timeout", attempts: 1 });
    expect(aborted).toBe(true);
  });
});
