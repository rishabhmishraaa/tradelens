import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { sessionReviews } from "../src/db/schema.ts";
import fixture from "../src/lib/__fixtures__/seed-stats.json" with { type: "json" };
import { formatMoney, formatPercent, formatSignedMoney } from "../src/lib/format.ts";
import { testDb } from "./db";

const db = testDb();
const ALL_SEED = "/?from=2026-10-05&to=2026-10-19";
// Next 16 keeps the previous page in the DOM (hidden) after a client-side navigation so going back
// is instant. Role queries skip hidden elements, but test ids don't, so only match visible ones.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const inr = fixture.summary.find((s) => s.currency === "INR")!;
const usd = fixture.summary.find((s) => s.currency === "USD")!;

test("F6.1 dashboard defaults to the 30 days ending at the latest trade and shows every section", { tag: "@prod" }, async ({ page }) => {
  await page.goto("/");
  // Latest demo trade exits 19 Oct 2026, so the default is 20 Sep – 19 Oct, not "the last 30 days from today".
  await expect(page.getByTestId("range-label")).toContainText("Sun, 20 Sep 2026 to Mon, 19 Oct 2026");
  await expect(page.getByTestId("summary-INR")).toBeVisible();
  await expect(page.getByTestId("summary-USD")).toBeVisible();
  await expect(page.getByRole("img", { name: /Equity curve, INR/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Equity curve, USD/ })).toBeVisible();
  await expect(page.getByTestId("tag-table").locator("tbody tr")).toHaveCount(fixture.byTag.length);
  await expect(page.getByTestId("session-list").getByRole("link")).toHaveCount(11);
});

test("F6.1 a custom range is applied and kept in the URL", { tag: "@prod" }, async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("From (session date)").fill("2026-10-06");
  await page.getByLabel("To").fill("2026-10-06");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/from=2026-10-06&to=2026-10-06/);
  // 6 Oct: two SBIN losses, an ICICIBANK short win, and the AXISBANK breakeven.
  await expect(visible(page, "summary-INR").locator('[data-stat="Trades"]')).toHaveText("4 (1 W / 2 L / 1 BE)");
  await expect(visible(page, "summary-USD")).toHaveCount(0);
});

test("F6.2 a session page shows that day's trades and stats", { tag: "@prod" }, async ({ page }) => {
  await page.goto(ALL_SEED);
  await page.getByTestId("session-list").getByRole("link", { name: "Tue, 06 Oct 2026" }).click();
  await expect(page).toHaveURL("/sessions/2026-10-06");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Session: Tue, 06 Oct 2026");
  await expect(visible(page, "trade-row")).toHaveCount(4);
  await expect(visible(page, "summary-INR")).toBeVisible();
  await expect(visible(page, "summary-INR").locator('[data-stat="Trades"]')).toHaveText("4 (1 W / 2 L / 1 BE)");
  await expect(visible(page, "saved-review")).toBeVisible(); // every demo day has a seeded review (F8.3)
});

test("F6.2 an invalid date returns 404; a day with no trades shows an empty state", { tag: "@prod" }, async ({ page }) => {
  for (const bad of ["2026-02-30", "not-a-date", "2026-10-6"]) {
    const response = await page.goto(`/sessions/${bad}`);
    expect(response?.status(), bad).toBe(404);
  }
  const ok = await page.goto("/sessions/2026-10-10"); // a Saturday
  expect(ok?.status()).toBe(200);
  await expect(page.getByTestId("empty-session")).toHaveText("No trades on this day.");
});

test("F6.2 a saved AI review is shown on its session page", async ({ page }) => {
  // The seed stores a review for every demo session (F8.3); read 5 Oct's straight from the database.
  const [saved] = await db
    .select()
    .from(sessionReviews)
    .where(and(eq(sessionReviews.userId, "demo"), eq(sessionReviews.sessionDate, "2026-10-05")));
  await page.goto("/sessions/2026-10-05");
  await expect(page.getByTestId("saved-review")).toContainText((saved.review as { summary: string }).summary);
  await expect(page.getByTestId("review-mistakes")).toContainText("fomo-entry (HDFCBANK)");
});

test("F6.3 dashboard numbers match the stats functions for the seed data (F5.7 fixture)", { tag: "@prod" }, async ({ page }) => {
  await page.goto(ALL_SEED);
  const stat = (currency: string, label: string) => page.getByTestId(`summary-${currency}`).locator(`[data-stat="${label}"]`);
  await expect(stat("INR", "Net P&L")).toHaveText(formatSignedMoney(inr.net, "INR"));
  await expect(stat("INR", "Win rate")).toHaveText(formatPercent(inr.winRate));
  await expect(stat("INR", "Max drawdown")).toHaveText(formatMoney(inr.maxDrawdown, "INR"));
  await expect(stat("INR", "Trades")).toHaveText(`${inr.trades} (${inr.wins} W / ${inr.losses} L / ${inr.breakevens} BE)`);
  await expect(stat("INR", "Largest loss")).toHaveText(formatSignedMoney(inr.largestLoss!, "INR"));
  await expect(stat("USD", "Net P&L")).toHaveText(formatSignedMoney(usd.net, "USD"));
  await expect(stat("USD", "Win rate")).toHaveText(formatPercent(usd.winRate));
  await expect(stat("USD", "Max drawdown")).toHaveText(formatMoney(usd.maxDrawdown, "USD"));
  // And literally, so a formatter bug can't hide a wrong number:
  await expect(stat("INR", "Net P&L")).toHaveText("−₹4,096.80");
  await expect(stat("USD", "Net P&L")).toHaveText("+$450.00");
});

test("F6.4 each equity curve has a text alternative with start, end, peak and max drawdown", { tag: "@prod" }, async ({ page }) => {
  await page.goto(ALL_SEED);
  const caption = page.getByTestId("equity-caption-USD");
  await expect(caption).toContainText("12 trades");
  await expect(caption).toContainText("starts at $0.00");
  await expect(caption).toContainText("ends at +$450.00");
  await expect(caption).toContainText("peak +$482.00");
  await expect(caption).toContainText("max drawdown $210.00");
  await expect(page.getByTestId("equity-caption-INR")).toContainText(`max drawdown ${formatMoney(inr.maxDrawdown, "INR")}`);
});

test("F6.5 stats are rendered on the server: the raw HTML response already contains them", { tag: "@prod" }, async ({ request }) => {
  // No browser and no client JavaScript: just the HTML the server sends.
  const html = await (await request.get(ALL_SEED)).text();
  expect(html).toContain("−₹4,096.80");
  expect(html).toContain("+$450.00");
  expect(html).toContain("max drawdown $210.00");
});

test.describe("F6.6 accessibility", { tag: "@prod" }, () => {
  for (const path of ["/", "/trades", "/sessions/2026-10-06", "/login"]) {
    test(`F6.6 ${path}: one h1 and no serious or critical axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await page.waitForLoadState("networkidle"); // streamed sections have arrived
      await expect(page.locator("h1")).toHaveCount(1);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }

  test("F6.6 keyboard focus is visible", { tag: "@prod" }, async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { tag: el.tagName, style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.tag).toBe("A");
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });
});
