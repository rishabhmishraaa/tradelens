import { existsSync } from "node:fs";

/** Loads .env.local when present (local runs). In CI the variables come from the environment. */
export function loadLocalEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}

const host = (url: string) => new URL(url).hostname;

/**
 * D13: returns the database URL for a target. The "test" target must be a different
 * Neon branch from DATABASE_URL, so destructive test helpers can never hit real data.
 */
export function databaseUrl(target: "main" | "test"): string {
  loadLocalEnv();
  const main = process.env.DATABASE_URL;
  const test = process.env.TEST_DATABASE_URL;
  if (target === "main") {
    if (!main) throw new Error("DATABASE_URL is not set (see .env.example).");
    return main;
  }
  if (!test) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  if (main && host(main) === host(test)) {
    throw new Error("TEST_DATABASE_URL points at the same database as DATABASE_URL. Refusing.");
  }
  return test;
}
