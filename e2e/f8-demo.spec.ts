import { expect, test, type Page } from "@playwright/test";
import { sessionDate } from "../src/lib/time.ts";
import { demoReviews } from "../src/db/demo-reviews.ts";
import { demoTrades } from "../src/db/seed-data.ts";
import { E2E_OWNER_PASSWORD } from "./test-env";

const BANNER = "Demo account: read-only. Data is sample data.";
const demoSessions = [...new Set(demoTrades().map((t) => sessionDate(t.exitAt)))].sort();

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(E2E_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

test("F8.1 visitors see the demo banner on every page", { tag: "@prod" }, async ({ page }) => {
  for (const path of ["/", "/trades", "/sessions/2026-10-09", "/trades/new", "/login"]) {
    await page.goto(path);
    await expect(page.getByTestId("demo-banner"), path).toContainText(BANNER);
  }
});

test("F8.1 the owner does not see the demo banner", async ({ page }) => {
  await logIn(page);
  for (const path of ["/", "/trades"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("demo-banner"), path).toHaveCount(0);
  }
});

test("F8.2 visitors get no create, edit, delete or generate controls anywhere", { tag: "@prod" }, async ({ page }) => {
  for (const path of ["/", "/trades", "/sessions/2026-10-09"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /New trade|^Edit|Delete/ }), path).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save|delete|Generate|Regenerate/i }), path).toHaveCount(0);
  }
});

test("F8.3 every demo session shows its pre-generated review, labelled as a sample", { tag: "@prod" }, async ({ page }) => {
  expect(demoSessions).toHaveLength(11);
  for (const date of demoSessions) {
    await page.goto(`/sessions/${date}`);
    await expect(page.getByTestId("saved-review"), date).toContainText(demoReviews[date].summary);
    await expect(page.getByTestId("review-source"), date).toContainText("Sample review, pre-generated for the demo");
  }
});

test("F8.4 browsing the whole demo sends no server-action requests (so no AI call is possible)", { tag: "@prod" }, async ({ page }) => {
  // Server actions are POST requests with a Next-Action header. A visitor browsing pages should make none.
  const posts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST") posts.push(`${req.url()} next-action=${req.headers()["next-action"] ?? "-"}`);
  });
  await page.goto("/");
  await page.getByTestId("session-list").getByRole("link").first().click();
  await expect(page.getByTestId("saved-review").filter({ visible: true })).toBeVisible();
  for (const path of ["/trades", ...demoSessions.map((d) => `/sessions/${d}`)]) {
    await page.goto(path);
  }
  expect(posts).toEqual([]);
});
