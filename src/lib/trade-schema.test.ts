import { describe, expect, it } from "vitest";
import { fieldErrors, tradeInputSchema, type TradeFormValues } from "./trade-schema";

const valid: TradeFormValues = {
  symbol: " reliance ",
  side: "long",
  entryPrice: "1412.50",
  exitPrice: "1421.80",
  quantity: "50",
  fees: "42.10",
  currency: "inr",
  entryAt: "2026-10-05T09:22",
  exitAt: "2026-10-05T10:05",
  tags: ["fomo-entry"],
  notes: "  ",
};

const errorsFor = (overrides: Partial<TradeFormValues>) => {
  const result = tradeInputSchema.safeParse({ ...valid, ...overrides });
  return result.success ? {} : fieldErrors(result.error);
};

describe("F4.2 trade input validation", () => {
  it("F4.2 accepts a valid trade and normalises it", () => {
    const result = tradeInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.symbol).toBe("RELIANCE");
    expect(result.data.currency).toBe("INR");
    expect(result.data.entryAt.toISOString()).toBe("2026-10-05T03:52:00.000Z");
    expect(result.data.notes).toBeNull();
  });

  const cases: [string, Partial<TradeFormValues>, string][] = [
    ["empty symbol", { symbol: "  " }, "symbol"],
    ["symbol over 20 chars", { symbol: "A".repeat(21) }, "symbol"],
    ["symbol with spaces", { symbol: "TATA MOTORS" }, "symbol"],
    ["unknown side", { side: "sideways" }, "side"],
    ["zero quantity", { quantity: "0" }, "quantity"],
    ["negative price", { entryPrice: "-1" }, "entryPrice"],
    ["zero exit price", { exitPrice: "0" }, "exitPrice"],
    ["text in price", { exitPrice: "abc" }, "exitPrice"],
    ["more than 8 decimals", { quantity: "0.123456789" }, "quantity"],
    ["negative fees", { fees: "-0.01" }, "fees"],
    ["lowercase 2-letter currency", { currency: "rs" }, "currency"],
    ["bad entry time", { entryAt: "2026-10-05" }, "entryAt"],
    ["unknown tag", { tags: ["bad-luck"] }, "tags"],
    ["notes over 1000 chars", { notes: "x".repeat(1001) }, "notes"],
  ];
  for (const [name, override, field] of cases) {
    it(`F4.2 rejects ${name} with a message on ${field}`, () => {
      const errors = errorsFor(override);
      expect(Object.keys(errors)).toContain(field);
      expect(errors[field as keyof typeof errors]).toBeTruthy();
    });
  }

  it("F4.2 zero fees are allowed", () => {
    expect(errorsFor({ fees: "0" })).toEqual({});
  });
});

describe("F4.3 exit after entry", () => {
  it("F4.3 rejects exit before entry, with the message on the exit field", () => {
    expect(errorsFor({ exitAt: "2026-10-05T09:00" })).toEqual({ exitAt: "Exit time must be after entry time" });
  });

  it("F4.3 rejects exit equal to entry", () => {
    expect(errorsFor({ exitAt: valid.entryAt })).toEqual({ exitAt: "Exit time must be after entry time" });
  });
});
