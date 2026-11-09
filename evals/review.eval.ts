// F9: `npm run eval` (real model, needs ANTHROPIC_API_KEY + ANTHROPIC_MODEL) or
// `npm run eval:dry` (mock model: proves the harness works, says nothing about model quality).
// Run by hand only; never in CI (F9.4). Live runs append their results to EVALS.md (F9.3).
import { appendFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { loadLocalEnv } from "@/db/targets";
import { chooseModel } from "@/server/ai/choose-model";
import type { ReviewModel } from "@/server/ai/generate";
import { evalFixtures } from "./fixtures";
import { formatTable, markdownEntry, runFixture, type EvalResult } from "./run";

const dry = process.env.EVAL_MODE === "dry";
const results: EvalResult[] = [];
let model: ReviewModel;

beforeAll(async () => {
  loadLocalEnv();
  const choice = await chooseModel(dry ? { AI_MODE: "mock" } : { ...process.env, AI_MODE: "live" });
  if (!choice.ok) {
    throw new Error(
      `${choice.detail}. Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL in .env.local to run the evals against the real model, ` +
        'or run "npm run eval:dry" to exercise the harness with the mock model.',
    );
  }
  model = choice.model;
});

for (const fixture of evalFixtures) {
  it(`${fixture.name}: ${fixture.covers}`, async () => {
    const result = await runFixture(model, fixture);
    results.push(result);
    expect(result.ok, result.detail).toBe(true); // F9.2: any failing fixture fails the run
  });
}

afterAll(() => {
  if (results.length === 0) return;
  console.log(`\n${dry ? "DRY RUN (mock model): harness check only, not a model evaluation" : `Model: ${model.name}`}\n${formatTable(results)}\n`);
  if (!dry) appendFileSync("EVALS.md", markdownEntry(new Date().toISOString().slice(0, 10), model.name, results));
});
