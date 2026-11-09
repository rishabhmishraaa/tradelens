import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// F9: separate config so evals never run with `npm test` or in CI (F9.4).
// `--mode dry` switches to the mock model.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    env: { TZ: "UTC", EVAL_MODE: mode === "dry" ? "dry" : "live" },
    testTimeout: 150_000, // up to 2 attempts × 60 s per fixture
    fileParallelism: false,
  },
}));
