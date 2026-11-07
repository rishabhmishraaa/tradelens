// F4.2: one Zod schema for trade input, used by the server actions. Same rules as the DB
// constraints (F2.2) plus form-level limits, so users get field messages instead of DB errors.
import { z } from "zod";
import { MISTAKE_TAGS } from "./mistake-tags";
import { istInputToUtc } from "./time";

// numeric(20, 8): at most 12 digits before the point and 8 after.
const DECIMAL = /^\d{1,12}(\.\d{1,8})?$/;

const decimal = (label: string, opts: { allowZero: boolean }) =>
  z
    .string()
    .trim()
    .regex(DECIMAL, `${label} must be a number with up to 8 decimals`)
    .refine((v) => (opts.allowZero ? Number(v) >= 0 : Number(v) > 0), `${label} must be ${opts.allowZero ? "0 or more" : "greater than 0"}`);

const istTime = (label: string) =>
  z
    .string()
    .transform((value, ctx) => {
      const date = istInputToUtc(value);
      if (!date) {
        ctx.addIssue({ code: "custom", message: `${label} must be a valid date and time` });
        return z.NEVER;
      }
      return date;
    });

export const tradeInputSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Symbol is required")
      .max(20, "Symbol must be 20 characters or fewer")
      .regex(/^[A-Z0-9.&_-]+$/, "Symbol can use letters, digits and . & _ -"),
    side: z.enum(["long", "short"], { error: "Choose long or short" }),
    entryPrice: decimal("Entry price", { allowZero: false }),
    exitPrice: decimal("Exit price", { allowZero: false }),
    quantity: decimal("Quantity", { allowZero: false }),
    fees: decimal("Fees", { allowZero: true }),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code like INR or USD"),
    entryAt: istTime("Entry time"),
    exitAt: istTime("Exit time"),
    tags: z.array(z.enum(MISTAKE_TAGS, { error: "Unknown mistake tag" })),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be 1000 characters or fewer")
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((t) => t.exitAt.getTime() > t.entryAt.getTime(), {
    path: ["exitAt"],
    message: "Exit time must be after entry time",
  });

export type TradeInput = z.infer<typeof tradeInputSchema>;
export type TradeField = keyof z.input<typeof tradeInputSchema>;

/** Raw form values, kept as strings so a failed submit can re-fill the form. */
export type TradeFormValues = Record<Exclude<TradeField, "tags">, string> & { tags: string[] };

export function formDataToValues(formData: FormData): TradeFormValues {
  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  return {
    symbol: text("symbol"),
    side: text("side"),
    entryPrice: text("entryPrice"),
    exitPrice: text("exitPrice"),
    quantity: text("quantity"),
    fees: text("fees") || "0",
    currency: text("currency"),
    entryAt: text("entryAt"),
    exitAt: text("exitAt"),
    tags: formData.getAll("tags").filter((v): v is string => typeof v === "string"),
    notes: text("notes"),
  };
}

export type FieldErrors = Partial<Record<TradeField, string>>;

/** First message per field, for showing next to each input. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as TradeField | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}
