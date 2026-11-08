import { defineConfig, devices } from "@playwright/test";
import { databaseUrl } from "./src/db/targets.ts";
import { E2E_SERVER_ENV } from "./e2e/test-env";

// BASE_URL set = test an already-running site (e.g. production, F10.3).
// Otherwise start the locally built app against the Neon TEST branch.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts", // resets + seeds the test branch
  retries: 0, // F1.5: a flaky test should fail, not be hidden by a retry
  // Tests share one database, so run them one at a time to keep them independent and predictable.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure", // F1.5
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: local
    ? {
        // F1.1: test the production build, not the dev server. The build happens BEFORE Playwright
        // (`npm run test:e2e` = next build && playwright test; CI has its own build step), so it never
        // sees these secrets, exactly like CI and Vercel. Secrets only reach the running server.
        command: "npm run start",
        // Readiness check on a page that doesn't query the database (global setup may be resetting it).
        url: `${baseURL}/login`,
        reuseExistingServer: false,
        timeout: 180_000,
        // Merged over process.env; wins over .env.local. The app's DATABASE_URL points at the TEST branch.
        // TZ=UTC: the server runs in UTC like Vercel, so time-zone bugs can't hide on an IST laptop.
        // AI_MODE=mock: the fake model answers; the real API is never called (F7.8).
        env: { ...E2E_SERVER_ENV, DATABASE_URL: databaseUrl("test"), TZ: "UTC", AI_MODE: "mock" },
      }
    : undefined,
});
