import { describe, expect, it } from "vitest";
import { curveFacts, curveGeometry } from "./equity";
import { formatMoney, formatPercent, formatSessionDate } from "./format";

describe("F6.4 equity curve facts", () => {
  it("F6.4 start 0, end, peak and max drawdown", () => {
    expect(curveFacts([50, 20, 70, 10, 40])).toEqual({ start: 0, end: 40, peak: 70, maxDrawdown: 60 });
  });
  it("F6.4 a curve that never goes above 0 has peak 0", () => {
    expect(curveFacts([-10, -30])).toEqual({ start: 0, end: -30, peak: 0, maxDrawdown: 30 });
  });
  it("F6.4 empty series", () => {
    expect(curveFacts([])).toEqual({ start: 0, end: 0, peak: 0, maxDrawdown: 0 });
  });
});

describe("F6.1 equity curve geometry", () => {
  it("F6.1 starts at the zero line, draws higher values higher, and stays inside the box", () => {
    const { points, zeroY } = curveGeometry([100, -100], 200, 100, 0);
    const ys = points.split(" ").map((p) => Number(p.split(",")[1]));
    expect(ys[0]).toBe(zeroY); // starts at 0
    expect(ys[1]).toBeLessThan(zeroY); // +100 above the zero line
    expect(ys[2]).toBeGreaterThan(zeroY); // −100 below it
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
  });
});

describe("display formatting", () => {
  it("formats money, percentages and session dates", () => {
    expect(formatMoney(6142.2, "INR")).toBe("₹6,142.20");
    expect(formatPercent(16 / 31)).toBe("51.6%");
    expect(formatPercent(null)).toBe("n/a");
    expect(formatSessionDate("2026-10-05")).toBe("Mon, 05 Oct 2026");
    expect(formatSessionDate("2026-09-20")).toBe("Sun, 20 Sep 2026"); // not "Sept"
  });
});
