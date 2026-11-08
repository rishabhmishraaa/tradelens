// D14 / D15: which model runs, decided from environment variables (passed in, so it's unit-testable).
import type { ReviewModel } from "./generate";
import { createMockModel, MOCK_SCENARIOS, type MockScenario } from "./mock-model";

export type AiEnv = {
  [name: string]: string | undefined; // so process.env can be passed directly
  AI_MODE?: string;
  VERCEL_ENV?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
};

/** D14: the mock must never run in production. Called at server start and before every use. */
export function assertSafeAiMode(env: AiEnv) {
  if (env.AI_MODE === "mock" && env.VERCEL_ENV === "production") {
    throw new Error("AI_MODE=mock is not allowed when VERCEL_ENV=production.");
  }
}

export type ModelChoice = { ok: true; model: ReviewModel } | { ok: false; error: "config"; detail: string };

export async function chooseModel(env: AiEnv, mockScenario?: string): Promise<ModelChoice> {
  assertSafeAiMode(env);
  if (env.AI_MODE === "mock") {
    const scenario = MOCK_SCENARIOS.includes(mockScenario as MockScenario) ? (mockScenario as MockScenario) : "valid";
    return { ok: true, model: createMockModel(scenario) };
  }
  if (!env.ANTHROPIC_API_KEY) return { ok: false, error: "config", detail: "ANTHROPIC_API_KEY is not set" };
  if (!env.ANTHROPIC_MODEL) return { ok: false, error: "config", detail: "ANTHROPIC_MODEL is not set" };
  // Imported lazily: in mock mode the real SDK client is never constructed (F7.8).
  const { createLiveModel } = await import("./live-model");
  return { ok: true, model: createLiveModel(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL) };
}
