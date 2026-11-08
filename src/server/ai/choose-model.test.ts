import { beforeEach, describe, expect, it, vi } from "vitest";

// Count how many times the real SDK client is constructed. No network calls happen in this file.
const constructed = vi.hoisted(() => ({ count: 0 }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: vi.fn() };
    constructor() {
      constructed.count++;
    }
  },
}));

import { assertSafeAiMode, chooseModel } from "./choose-model";
import { MOCK_MODEL_NAME } from "./mock-model";

beforeEach(() => {
  constructed.count = 0;
});

describe("F7.8 tests never use the real API", () => {
  it("F7.8 AI_MODE=mock returns the mock and never constructs the real client", async () => {
    const choice = await chooseModel({ AI_MODE: "mock", ANTHROPIC_API_KEY: "sk-ant-test", ANTHROPIC_MODEL: "x" });
    expect(choice).toMatchObject({ ok: true, model: { name: MOCK_MODEL_NAME } });
    expect(constructed.count).toBe(0);
  });
  it("F7.8 an unknown mock scenario falls back to 'valid'", async () => {
    const choice = await chooseModel({ AI_MODE: "mock" }, "nonsense");
    expect(choice.ok).toBe(true);
  });
  it("live mode with a key and model constructs exactly one client", async () => {
    const choice = await chooseModel({ ANTHROPIC_API_KEY: "sk-ant-test", ANTHROPIC_MODEL: "some-model" });
    expect(choice).toMatchObject({ ok: true, model: { name: "some-model" } });
    expect(constructed.count).toBe(1);
  });
});

describe("F7.5 / D15 configuration errors", () => {
  it("F7.5 a missing API key or model is a config error, not a crash", async () => {
    expect(await chooseModel({ ANTHROPIC_MODEL: "m" })).toMatchObject({ ok: false, error: "config" });
    expect(await chooseModel({ ANTHROPIC_API_KEY: "k" })).toMatchObject({ ok: false, error: "config" });
    expect(constructed.count).toBe(0);
  });
});

describe("D14 mock mode is refused in production", () => {
  it("D14 throws for AI_MODE=mock with VERCEL_ENV=production", async () => {
    expect(() => assertSafeAiMode({ AI_MODE: "mock", VERCEL_ENV: "production" })).toThrow(/not allowed/);
    await expect(chooseModel({ AI_MODE: "mock", VERCEL_ENV: "production" })).rejects.toThrow(/not allowed/);
  });
  it("D14 allows mock in preview/local, and live in production", () => {
    expect(() => assertSafeAiMode({ AI_MODE: "mock", VERCEL_ENV: "preview" })).not.toThrow();
    expect(() => assertSafeAiMode({ AI_MODE: "live", VERCEL_ENV: "production" })).not.toThrow();
  });
});
