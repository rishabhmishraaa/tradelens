import { expect, test, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { sessionReviews, trades } from "../src/db/schema.ts";
import { testDb } from "./db";
import { E2E_OWNER_PASSWORD } from "./test-env";

// The E2E server runs with AI_MODE=mock (playwright.config.ts): no real API calls, ever (F7.8).
const db = testDb();
const DAY = "2026-11-02";

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(E2E_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

/** Picks the mock model's behaviour for the next request (honoured only in AI_MODE=mock). */
async function useScenario(page: Page, scenario: string) {
  await page.context().addCookies([{ name: "tl_ai_mock", value: scenario, url: "http://localhost:3000" }]);
}

const ownerReviews = () =>
  db.select().from(sessionReviews).where(and(eq(sessionReviews.userId, "owner"), eq(sessionReviews.sessionDate, DAY)));

test.beforeEach(async () => {
  await db.delete(sessionReviews).where(eq(sessionReviews.userId, "owner"));
  await db.delete(trades).where(eq(trades.userId, "owner"));
  const base = { userId: "owner", side: "long" as const, quantity: "10", fees: "5", currency: "INR" };
  await db.insert(trades).values([
    { ...base, symbol: "RELIANCE", entryPrice: "100", exitPrice: "95", entryAt: new Date("2026-11-02T04:00:00Z"), exitAt: new Date("2026-11-02T04:30:00Z"), tags: ["fomo-entry"] },
    { ...base, symbol: "INFY", entryPrice: "100", exitPrice: "110", entryAt: new Date("2026-11-02T05:00:00Z"), exitAt: new Date("2026-11-02T06:00:00Z"), tags: [] },
  ]);
});

const generate = (page: Page) => page.getByRole("button", { name: /Generate AI review|Regenerate review/ }).click();

test("F7.6 a valid review is shown, saved with the model name, and still there after reload", async ({ page }) => {
  await logIn(page);
  await useScenario(page, "valid");
  await page.goto(`/sessions/${DAY}`);
  await generate(page);
  const review = page.getByTestId("saved-review");
  await expect(review).toContainText(`Mock review of ${DAY}: 2 trade(s).`);
  // Grounded: the fomo-entry mistake names the right trade, shown by symbol rather than id.
  await expect(page.getByTestId("review-mistakes")).toContainText("fomo-entry (RELIANCE)");

  const [row] = await ownerReviews();
  expect(row.model).toBe("mock-model");

  await page.reload();
  await expect(page.getByTestId("saved-review")).toContainText(`Mock review of ${DAY}`);
  await expect(page.getByRole("button", { name: "Regenerate review" })).toBeVisible();
});

test("F7.4 invalid output on the first try is retried once and then succeeds", async ({ page }) => {
  await logIn(page);
  await useScenario(page, "invalid-then-valid");
  await page.goto(`/sessions/${DAY}`);
  await generate(page);
  await expect(page.getByTestId("saved-review")).toContainText("Mock review");
  expect(await ownerReviews()).toHaveLength(1);
});

for (const scenario of ["invalid-json", "schema", "grounding"]) {
  test(`F7.4 invalid output twice (${scenario}) shows a message and saves nothing`, async ({ page }) => {
    await logIn(page);
    await useScenario(page, scenario);
    await page.goto(`/sessions/${DAY}`);
    await generate(page);
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't generate a review. Try again." })).toBeVisible();
    await expect(page.getByTestId("saved-review")).toHaveCount(0);
    expect(await ownerReviews()).toHaveLength(0);
  });
}

test("F7.4 a failed regenerate keeps the previous saved review", async ({ page }) => {
  await logIn(page);
  await useScenario(page, "valid");
  await page.goto(`/sessions/${DAY}`);
  await generate(page);
  await expect(page.getByTestId("saved-review")).toBeVisible();
  const [before] = await ownerReviews();

  await useScenario(page, "grounding");
  await generate(page);
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't generate a review" })).toBeVisible();
  await expect(page.getByTestId("saved-review")).toContainText("Mock review"); // still shown
  const [after] = await ownerReviews();
  expect(after.createdAt.getTime()).toBe(before.createdAt.getTime()); // not overwritten
});

test("F7.5 an API error shows a clear message, saves nothing and doesn't crash", async ({ page }) => {
  await logIn(page);
  await useScenario(page, "api-error");
  await page.goto(`/sessions/${DAY}`);
  await generate(page);
  await expect(page.getByRole("alert").filter({ hasText: "didn't respond properly" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // page still works
  expect(await ownerReviews()).toHaveLength(0);
});

test("F7.7 generating without an owner session is rejected on the server", async ({ page }) => {
  await logIn(page);
  await page.goto(`/sessions/${DAY}`);
  await page.context().clearCookies(); // the button is on screen, but the session is gone
  await generate(page);
  await expect(page.getByRole("alert").filter({ hasText: "logged in as the owner" })).toBeVisible();
  expect(await ownerReviews()).toHaveLength(0);
});

test("F7.7 demo visitors see no generate button", async ({ page }) => {
  await page.goto("/sessions/2026-10-09");
  await expect(page.getByTestId("trade-row").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate AI review|Regenerate review/ })).toHaveCount(0);
});
