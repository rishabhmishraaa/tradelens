import { describe, expect, it } from "vitest";
import { formatDecimal, formatSignedMoney } from "./format";

describe("F4.5 money formatting", () => {
  it("F4.5 shows a sign for wins and losses, none for zero", () => {
    expect(formatSignedMoney(1234.5, "INR")).toBe("+₹1,234.50");
    expect(formatSignedMoney(-12, "USD")).toBe("−$12.00");
    expect(formatSignedMoney(0, "INR")).toBe("₹0.00");
    expect(formatSignedMoney(-0.001, "INR")).toBe("₹0.00");
  });

  it("formatDecimal trims Postgres numeric padding", () => {
    expect(formatDecimal("1412.50000000")).toBe("1412.5");
    expect(formatDecimal("50.00000000")).toBe("50");
    expect(formatDecimal("0.00001234")).toBe("0.00001234");
  });
});
