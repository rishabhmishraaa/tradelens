import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Run in UTC like Vercel and CI. On an IST laptop, a bug such as `new Date("2026-10-05T09:20")`
    // would accidentally give the right answer and the tests would miss it.
    env: { TZ: "UTC" },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        // [Int] tests run against the Neon TEST branch (D13), one file at a time.
        extends: true,
        test: {
          name: "int",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./src/db/int-global-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
