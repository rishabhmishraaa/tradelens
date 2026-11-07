import { defineConfig, devices } from "@playwright/test";

// BASE_URL set = test an already-running site (e.g. production, F10.3).
// Otherwise build and start the app locally. In CI the build step runs first, so only start.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  retries: 0, // F1.5: a flaky test should fail, not be hidden by a retry
  forbidOnly: isCI,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure", // F1.5
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // F1.1: test the production build, not the dev server
        command: isCI ? "npm run start" : "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
