import { describe, expect, it } from "vitest";
import { istDateRangeToUtc, istInputToUtc, sessionDate, utcToIstInput } from "./time";

describe("F4.4 IST <-> UTC conversion", () => {
  it("F4.4 converts IST form input to the right UTC instant (IST = UTC+05:30)", () => {
    expect(istInputToUtc("2026-10-05T09:20")?.toISOString()).toBe("2026-10-05T03:50:00.000Z");
    expect(istInputToUtc("2026-10-08T00:30")?.toISOString()).toBe("2026-10-07T19:00:00.000Z");
  });

  it("F4.4 round-trips: the edit form shows exactly what was entered", () => {
    for (const value of ["2026-10-05T09:20", "2026-10-08T00:30", "2026-12-31T23:59", "2027-01-01T00:00"]) {
      expect(utcToIstInput(istInputToUtc(value)!)).toBe(value);
    }
  });

  it("F4.4 rejects malformed or impossible times instead of guessing", () => {
    for (const bad of ["", "2026-10-05", "2026-10-05 09:20", "2026-10-05T9:20", "2026-02-31T10:00", "2026-10-05T24:30"]) {
      expect(istInputToUtc(bad)).toBeNull();
    }
  });
});

describe("F5.6 session date (D4)", () => {
  it("F5.6 a trade exiting 00:30 IST (19:00 UTC the day before) lands on the IST date", () => {
    expect(sessionDate(new Date("2026-10-07T19:00:00Z"))).toBe("2026-10-08");
    expect(sessionDate(new Date("2026-10-07T18:29:00Z"))).toBe("2026-10-07");
  });
});

describe("F4.6 date range filter", () => {
  it("F4.6 covers whole IST days, inclusive of the end date", () => {
    const range = istDateRangeToUtc("2026-10-06", "2026-10-07");
    expect(range?.start.toISOString()).toBe("2026-10-05T18:30:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-10-07T18:30:00.000Z");
  });

  it("F4.6 returns null for invalid dates", () => {
    expect(istDateRangeToUtc("2026-13-01", "2026-10-07")).toBeNull();
    expect(istDateRangeToUtc("yesterday", "2026-10-07")).toBeNull();
  });
});
