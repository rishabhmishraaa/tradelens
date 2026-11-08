// F7.4 / F7.5: call the model, validate, check grounding, retry once on invalid output,
// and turn every failure into a result (never a crash). No DB or Next imports: unit-tested
// with fake models.
import { groundingProblems, reviewSchema, type Review } from "./review-schema";
import type { ReviewInput } from "./review-input";

/** A model returns raw text (expected to be JSON). Implemented by the live client and the mock. */
export type ReviewModel = {
  name: string;
  generate(input: ReviewInput, signal: AbortSignal): Promise<string>;
};

export type GenerateResult =
  | { ok: true; review: Review; attempts: number }
  | { ok: false; error: "invalid" | "api" | "timeout"; attempts: number; detail: string };

/** Parses and checks one raw response. Returns the review, or why it was rejected. */
export function validateRaw(raw: string, input: ReviewInput): { review: Review } | { problem: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { problem: "response was not valid JSON" };
  }
  const parsed = reviewSchema.safeParse(json);
  if (!parsed.success) return { problem: `schema: ${parsed.error.issues[0]?.message ?? "invalid"}` };
  const problems = groundingProblems(parsed.data, input.trades.map((t) => ({ id: t.id, tags: t.mistakeTags })));
  if (problems.length) return { problem: `grounding: ${problems[0]}` };
  return { review: parsed.data };
}

async function callWithTimeout(model: ReviewModel, input: ReviewInput, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([model.generate(input, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

class TimeoutError extends Error {}

/** At most 2 attempts: the second only after an invalid response (not after an API error or timeout). */
export async function generateReview(model: ReviewModel, input: ReviewInput, timeoutMs = 30_000): Promise<GenerateResult> {
  let lastProblem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: string;
    try {
      raw = await callWithTimeout(model, input, timeoutMs);
    } catch (e) {
      if (e instanceof TimeoutError) return { ok: false, error: "timeout", attempts: attempt, detail: `no response in ${timeoutMs} ms` };
      return { ok: false, error: "api", attempts: attempt, detail: e instanceof Error ? e.message : String(e) };
    }
    const result = validateRaw(raw, input);
    if ("review" in result) return { ok: true, review: result.review, attempts: attempt };
    lastProblem = result.problem;
  }
  return { ok: false, error: "invalid", attempts: 2, detail: lastProblem };
}
