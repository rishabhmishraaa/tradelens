// F9.2: run the real review pipeline on one fixture and grade the outcome with code.
import { generateReview, type ReviewModel } from "@/server/ai/generate";
import { buildReviewInput } from "@/server/ai/review-input";
import type { EvalFixture } from "./fixtures";

export type EvalResult = {
  name: string;
  ok: boolean;
  schemaValid: boolean;
  grounded: boolean;
  retryUsed: boolean;
  latencyMs: number;
  detail: string;
};

export async function runFixture(model: ReviewModel, fixture: EvalFixture, timeoutMs = 60_000): Promise<EvalResult> {
  const input = buildReviewInput(fixture.date, fixture.trades);
  const started = performance.now();
  const result = await generateReview(model, input, timeoutMs);
  const latencyMs = Math.round(performance.now() - started);

  if (result.ok) {
    return { name: fixture.name, ok: true, schemaValid: true, grounded: true, retryUsed: result.attempts > 1, latencyMs, detail: "" };
  }
  // generate.ts reports the last problem: "grounding: …" means the schema passed but grounding didn't.
  const groundingFailure = result.error === "invalid" && result.detail.startsWith("grounding");
  return {
    name: fixture.name,
    ok: false,
    schemaValid: groundingFailure,
    grounded: false,
    retryUsed: result.attempts > 1,
    latencyMs,
    detail: `${result.error}: ${result.detail}`,
  };
}

const yesNo = (b: boolean) => (b ? "yes" : "no");

/** Fixed-width table for the terminal. */
export function formatTable(results: EvalResult[]): string {
  const rows = [
    ["fixture", "result", "schema", "grounded", "retry", "latency"],
    ...results.map((r) => [r.name, r.ok ? "PASS" : "FAIL", yesNo(r.schemaValid), yesNo(r.grounded), yesNo(r.retryUsed), `${r.latencyMs} ms`]),
  ];
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  const line = (row: string[]) => row.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  const failures = results.filter((r) => !r.ok).map((r) => `  ${r.name}: ${r.detail}`);
  const passed = results.filter((r) => r.ok).length;
  return [line(rows[0]), ...rows.slice(1).map(line), "", `${passed}/${results.length} passed`, ...failures].join("\n");
}

/** One entry for EVALS.md (F9.3). */
export function markdownEntry(date: string, model: string, results: EvalResult[]): string {
  const passed = results.filter((r) => r.ok).length;
  const rows = results.map(
    (r) => `| ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${yesNo(r.schemaValid)} | ${yesNo(r.grounded)} | ${yesNo(r.retryUsed)} | ${r.latencyMs} ms |`,
  );
  return [
    "",
    `## ${date}: ${model}: ${passed}/${results.length} passed`,
    "",
    "| Fixture | Result | Schema | Grounded | Retry | Latency |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}
