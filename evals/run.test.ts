import { describe, expect, it } from "vitest";
import { MISTAKE_TAGS } from "@/lib/mistake-tags";
import { groupByCurrency, netPnl, outcome } from "@/lib/stats";
import { createMockModel } from "@/server/ai/mock-model";
import { evalFixtures } from "./fixtures";
import { formatTable, markdownEntry, runFixture } from "./run";

const byName = (name: string) => evalFixtures.find((f) => f.name === name)!;

describe("F9.1 eval fixtures are what they claim to be", () => {
  it("F9.1 there are at least 5, with unique names and trade ids", () => {
    expect(evalFixtures.length).toBeGreaterThanOrEqual(5);
    expect(new Set(evalFixtures.map((f) => f.name)).size).toBe(evalFixtures.length);
    const ids = evalFixtures.flatMap((f) => f.trades.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("F9.1 every trade uses only known tags and exits after entry", () => {
    for (const t of evalFixtures.flatMap((f) => f.trades)) {
      expect(t.tags.every((tag) => (MISTAKE_TAGS as readonly string[]).includes(tag))).toBe(true);
      expect(t.exitAt.getTime()).toBeGreaterThan(t.entryAt.getTime());
    }
  });
  it("F9.1 no-mistakes has no tags", () => {
    expect(byName("no-mistakes").trades.flatMap((t) => t.tags)).toEqual([]);
  });
  it("F9.1 all-loss really is all losses", () => {
    expect(byName("all-loss").trades.map((t) => outcome(netPnl(t)))).toEqual(["loss", "loss", "loss"]);
  });
  it("F9.1 revenge-day contains a revenge trade", () => {
    expect(byName("revenge-day").trades.some((t) => t.tags.includes("revenge-trade"))).toBe(true);
  });
  it("F9.1 mixed-currency has two currencies", () => {
    expect([...groupByCurrency(byName("mixed-currency").trades).keys()]).toEqual(["INR", "USD"]);
  });
  it("F9.1 long-notes has notes over 500 characters", () => {
    expect(Math.min(...byName("long-notes").trades.map((t) => t.notes?.length ?? 0))).toBeGreaterThan(500);
  });
});

describe("F9.2 the harness grades correctly (and can fail)", () => {
  const fixture = byName("revenge-day");
  it("F9.2 a valid review passes every check", async () => {
    expect(await runFixture(createMockModel("valid"), fixture)).toMatchObject({ ok: true, schemaValid: true, grounded: true, retryUsed: false });
  });
  it("F9.2 a recovered first attempt is reported as a retry", async () => {
    expect(await runFixture(createMockModel("invalid-then-valid"), fixture)).toMatchObject({ ok: true, retryUsed: true });
  });
  it("F9.2 a grounding failure: schema passes, grounding fails", async () => {
    expect(await runFixture(createMockModel("grounding"), fixture)).toMatchObject({ ok: false, schemaValid: true, grounded: false });
  });
  it("F9.2 a schema failure fails both", async () => {
    expect(await runFixture(createMockModel("schema"), fixture)).toMatchObject({ ok: false, schemaValid: false, grounded: false });
  });
  it("F9.2 an API error is a failure with the reason", async () => {
    const result = await runFixture(createMockModel("api-error"), fixture);
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/^api:/);
  });
  it("F9.2 the table and the EVALS.md entry show results and the pass rate", async () => {
    const results = [await runFixture(createMockModel("valid"), fixture), await runFixture(createMockModel("grounding"), byName("all-loss"))];
    const table = formatTable(results);
    expect(table).toMatch(/revenge-day\s+PASS/);
    expect(table).toMatch(/all-loss\s+FAIL/);
    expect(table).toContain("1/2 passed");
    expect(markdownEntry("2026-11-09", "some-model", results)).toContain("## 2026-11-09: some-model: 1/2 passed");
  });
});
