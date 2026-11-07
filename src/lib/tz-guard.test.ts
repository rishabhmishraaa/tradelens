import { expect, it } from "vitest";

// Guards the guard: if this fails, the TZ=UTC setting in vitest.config.ts stopped working,
// and time-zone bugs could pass unnoticed on an IST machine.
it("tests run in UTC, like the production server", () => {
  expect(new Date("2026-10-05T09:20").toISOString()).toBe("2026-10-05T09:20:00.000Z");
});
