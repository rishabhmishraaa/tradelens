import { expect, test } from "@playwright/test";

test("F1.2 home page returns 200", { tag: "@prod" }, async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});
