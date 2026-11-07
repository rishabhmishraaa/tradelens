import { expect, test, type Page } from "@playwright/test";
import { and, desc, eq } from "drizzle-orm";
import { trades } from "../src/db/schema.ts";
import { testDb } from "./db";
import { E2E_OWNER_PASSWORD } from "./test-env";

const db = testDb();

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(E2E_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

const ownerTrades = () => db.select().from(trades).where(eq(trades.userId, "owner"));

async function insertOwnerTrade(symbol: string) {
  const [row] = await db
    .insert(trades)
    .values({
      userId: "owner",
      symbol,
      side: "long",
      entryPrice: "100",
      exitPrice: "110",
      quantity: "10",
      fees: "5",
      currency: "INR",
      entryAt: new Date("2026-11-02T03:50:00Z"),
      exitAt: new Date("2026-11-02T04:35:00Z"),
      tags: ["fomo-entry"],
    })
    .returning();
  return row;
}

async function fillTrade(page: Page, v: { symbol: string; quantity: string; entryAt: string; exitAt: string }) {
  await page.getByLabel("Symbol").fill(v.symbol);
  await page.getByLabel("Side").selectOption("long");
  await page.getByLabel("Entry price").fill("1412.50");
  await page.getByLabel("Exit price").fill("1421.80");
  await page.getByLabel("Quantity").fill(v.quantity);
  await page.getByLabel("Fees").fill("42.10");
  await page.getByLabel("Currency").fill("INR");
  await page.getByLabel("Entry time (IST)").fill(v.entryAt);
  await page.getByLabel("Exit time (IST)").fill(v.exitAt);
}

test.beforeEach(async () => {
  await db.delete(trades).where(eq(trades.userId, "owner")); // demo data is untouched
});

test("F4.1 the new-trade form has every field and the 10 mistake tags", async ({ page }) => {
  await logIn(page);
  await page.goto("/trades/new");
  for (const label of ["Symbol", "Side", "Entry price", "Exit price", "Quantity", "Fees", "Currency", "Entry time (IST)", "Exit time (IST)", "Notes"]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("group", { name: "Mistakes" }).getByRole("checkbox")).toHaveCount(10);
});

test("F4.2 invalid input shows field messages, keeps the values and saves nothing", async ({ page }) => {
  await logIn(page);
  await page.goto("/trades/new");
  await fillTrade(page, { symbol: "TATA MOTORS", quantity: "0", entryAt: "2026-11-02T09:20", exitAt: "2026-11-02T10:05" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.locator("#quantity-error")).toHaveText("Quantity must be greater than 0");
  await expect(page.locator("#symbol-error")).toContainText("letters, digits");
  await expect(page.getByLabel("Quantity")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Symbol")).toHaveValue("TATA MOTORS");
  await expect(page).toHaveURL("/trades/new");
  expect(await ownerTrades()).toHaveLength(0);
});

test("F4.3 exit before entry is rejected with a message on the exit field", async ({ page }) => {
  await logIn(page);
  await page.goto("/trades/new");
  await fillTrade(page, { symbol: "INFY", quantity: "10", entryAt: "2026-11-02T10:05", exitAt: "2026-11-02T09:20" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.locator("#exitAt-error")).toHaveText("Exit time must be after entry time");
  expect(await ownerTrades()).toHaveLength(0);
});

test("F4.4 IST times are stored as UTC and shown back unchanged on the edit form", async ({ page }) => {
  await logIn(page);
  await page.goto("/trades/new");
  await fillTrade(page, { symbol: "reliance", quantity: "50", entryAt: "2026-11-02T09:20", exitAt: "2026-11-03T00:30" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL("/trades");

  const [saved] = await ownerTrades();
  expect(saved.symbol).toBe("RELIANCE");
  expect(saved.entryAt.toISOString()).toBe("2026-11-02T03:50:00.000Z"); // 09:20 IST
  expect(saved.exitAt.toISOString()).toBe("2026-11-02T19:00:00.000Z"); // 00:30 IST next day

  await page.goto(`/trades/${saved.id}/edit`);
  await expect(page.getByLabel("Entry time (IST)")).toHaveValue("2026-11-02T09:20");
  await expect(page.getByLabel("Exit time (IST)")).toHaveValue("2026-11-03T00:30");
});

test("F4.5 the list is newest exit first, with signed net P&L and a text result label", async ({ page }) => {
  await page.goto("/trades"); // logged out: the demo account
  const expected = await db.select({ id: trades.id }).from(trades).where(eq(trades.userId, "demo")).orderBy(desc(trades.exitAt), desc(trades.id));
  const rows = page.getByTestId("trade-row");
  await expect(rows).toHaveCount(expected.length);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-trade-id")))).toEqual(expected.map((r) => r.id));

  for (const row of await rows.all()) {
    const net = (await row.getByTestId("net-pnl").textContent()) ?? "";
    const label = await row.getByTestId("outcome").textContent();
    if (label === "Win") expect(net.startsWith("+")).toBe(true);
    else if (label === "Loss") expect(net.startsWith("−")).toBe(true);
    else {
      expect(label).toBe("Breakeven");
      expect(net).toMatch(/^[^+−]/);
    }
  }
  await expect(rows.filter({ hasText: "AXISBANK" }).getByTestId("outcome")).toHaveText("Breakeven");
});

test("F4.6 date filter is inclusive, uses the IST session date and lives in the URL", async ({ page }) => {
  await page.goto("/trades?from=2026-10-06&to=2026-10-06");
  await expect(page.getByTestId("trade-row")).toHaveCount(4);

  await page.getByLabel("From (session date)").fill("2026-10-07");
  await page.getByLabel("To").fill("2026-10-07");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/from=2026-10-07&to=2026-10-07/);
  // TSLA was entered on 7 Oct but exited 00:30 IST on 8 Oct, so it belongs to the 8 Oct session (D4).
  await expect(page.getByTestId("trade-row")).toHaveCount(2);
  await expect(page.getByTestId("trade-row").filter({ hasText: "TSLA" })).toHaveCount(0);

  await page.goto("/trades?from=2026-10-08&to=2026-10-08");
  await expect(page.getByTestId("trade-row").filter({ hasText: "TSLA" })).toHaveCount(1);
});

test("F4.7 the owner can edit a trade", async ({ page }) => {
  const trade = await insertOwnerTrade("EDITME");
  await logIn(page);
  await page.goto("/trades");
  await page.getByRole("link", { name: "Edit EDITME trade" }).click();
  await page.getByLabel("Symbol").fill("EDITED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/trades");
  await expect(page.getByTestId("trade-row").filter({ hasText: "EDITED" })).toHaveCount(1);
  const [saved] = await db.select().from(trades).where(eq(trades.id, trade.id));
  expect(saved.symbol).toBe("EDITED");
});

test("F4.7 the owner can delete a trade after confirming", async ({ page }) => {
  const trade = await insertOwnerTrade("DELETEME");
  await logIn(page);
  await page.goto(`/trades/${trade.id}/edit`);
  await page.getByRole("link", { name: "Delete this trade" }).click();
  await expect(page.getByRole("heading", { name: "Delete trade?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL("/trades");
  await expect(page.getByTestId("trade-row").filter({ hasText: "DELETEME" })).toHaveCount(0);
  expect(await db.select().from(trades).where(eq(trades.id, trade.id))).toHaveLength(0);
});

test.describe("F4.8 writes are rejected on the server without an owner session", () => {
  const NOT_AUTHORIZED = "You must be logged in as the owner to change trades.";

  test("F4.8 create: form loaded while logged in, submitted after the cookie is gone", async ({ page }) => {
    await logIn(page);
    await page.goto("/trades/new");
    await fillTrade(page, { symbol: "SNEAKY", quantity: "1", entryAt: "2026-11-02T09:20", exitAt: "2026-11-02T10:05" });
    await page.context().clearCookies();
    await page.getByRole("button", { name: "Save trade" }).click();
    await expect(page.getByRole("alert").filter({ hasText: NOT_AUTHORIZED })).toBeVisible();
    expect(await ownerTrades()).toHaveLength(0);
  });

  test("F4.8 update: the row is unchanged", async ({ page }) => {
    const trade = await insertOwnerTrade("KEEPME");
    await logIn(page);
    await page.goto(`/trades/${trade.id}/edit`);
    await page.getByLabel("Symbol").fill("HACKED");
    await page.context().clearCookies();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert").filter({ hasText: NOT_AUTHORIZED })).toBeVisible();
    const [row] = await db.select().from(trades).where(and(eq(trades.id, trade.id), eq(trades.userId, "owner")));
    expect(row.symbol).toBe("KEEPME");
  });

  test("F4.8 delete: the row still exists", async ({ page }) => {
    const trade = await insertOwnerTrade("STAYPUT");
    await logIn(page);
    await page.goto(`/trades/${trade.id}/delete`);
    await page.context().clearCookies();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("alert").filter({ hasText: NOT_AUTHORIZED })).toBeVisible();
    expect(await db.select().from(trades).where(eq(trades.id, trade.id))).toHaveLength(1);
  });

  test("F4.8 logged-out visitors get no write controls", async ({ page }) => {
    await page.goto("/trades");
    await expect(page.getByTestId("trade-row").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "New trade" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Edit/ })).toHaveCount(0);
    await page.goto("/trades/new");
    await expect(page.getByText("Only the owner can change trades.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save trade" })).toHaveCount(0);
  });
});
