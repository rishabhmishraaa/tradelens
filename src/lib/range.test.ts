import { describe, expect, it } from "vitest";
import { addDays, defaultRange, isIsoDate } from "./range";

describe("F6.1 default dashboard range", () => {
  it("F6.1 is the 30 days (inclusive) ending at the latest trade's session", () => {
    expect(defaultRange("2026-10-19", "2026-12-25")).toEqual({ from: "2026-09-20", to: "2026-10-19" });
  });
  it("F6.1 ends today when there are no trades", () => {
    expect(defaultRange(null, "2026-11-08")).toEqual({ from: "2026-10-10", to: "2026-11-08" });
  });
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("isIsoDate rejects impossible dates", () => {
    expect(isIsoDate("2026-10-19")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("19-10-2026")).toBe(false);
  });
});
