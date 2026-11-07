import { expect, test, type Page } from "@playwright/test";
import { E2E_OWNER_PASSWORD } from "./test-env";

const COOKIE = "tl_session";

async function logIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

const sessionCookie = async (page: Page) => (await page.context().cookies()).find((c) => c.name === COOKIE);

test("F3.1 correct password logs in and redirects home", async ({ page }) => {
  await logIn(page, E2E_OWNER_PASSWORD);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(await sessionCookie(page)).toBeDefined();
});

test("F3.1 wrong password shows an error and sets no cookie", async ({ page }) => {
  await logIn(page, "not-the-password");
  // Next.js renders its own empty role="alert" (route announcer), so filter by text.
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect password" })).toBeVisible();
  await expect(page).toHaveURL("/login");
  expect(await sessionCookie(page)).toBeUndefined();
});

test("F3.2 session cookie is httpOnly, SameSite=Lax, expires in 7 days (not Secure over plain http)", async ({ page }) => {
  await logIn(page, E2E_OWNER_PASSWORD);
  await expect(page).toHaveURL("/");
  const cookie = await sessionCookie(page);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  // Secure is set when the request is HTTPS (unit-tested in token.test.ts); this local server is http.
  expect(cookie?.secure).toBe(false);
  const sevenDays = 7 * 24 * 60 * 60;
  expect(Math.abs(cookie!.expires - (Date.now() / 1000 + sevenDays))).toBeLessThan(120);
});

test("F3.3 a tampered session cookie counts as logged out", async ({ page }) => {
  await logIn(page, E2E_OWNER_PASSWORD);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  const cookie = (await sessionCookie(page))!;
  const [, signature] = cookie.value.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ sub: "owner", exp: 9_999_999_999 })).toString("base64url");
  await page.context().addCookies([{ ...cookie, value: `${forgedPayload}.${signature}` }]);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
});

test("F3.6 logout clears the cookie and returns to the public view", async ({ page }) => {
  await logIn(page, E2E_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  expect(await sessionCookie(page)).toBeUndefined();
});
