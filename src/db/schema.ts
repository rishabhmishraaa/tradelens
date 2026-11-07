// Imports use relative paths with .ts extensions so Node can run scripts/db.ts directly.
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { MISTAKE_TAGS } from "../lib/mistake-tags.ts";

// D7: money and quantities are numeric, never float.
const decimal = (name: string) => numeric(name, { precision: 20, scale: 8 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const knownTags = sql.raw(MISTAKE_TAGS.map((t) => `'${t}'`).join(", "));

/** D11: exactly two rows, "owner" and "demo". */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    side: text("side", { enum: ["long", "short"] }).notNull(),
    entryPrice: decimal("entry_price").notNull(),
    exitPrice: decimal("exit_price").notNull(),
    quantity: decimal("quantity").notNull(),
    fees: decimal("fees").notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
    entryAt: timestamp("entry_at", { withTimezone: true }).notNull(), // D4: stored in UTC
    exitAt: timestamp("exit_at", { withTimezone: true }).notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // F2.2: the database itself rejects impossible trades, whatever the app does.
    check("trades_quantity_positive", sql`${t.quantity} > 0`),
    check("trades_entry_price_positive", sql`${t.entryPrice} > 0`),
    check("trades_exit_price_positive", sql`${t.exitPrice} > 0`),
    check("trades_fees_non_negative", sql`${t.fees} >= 0`),
    check("trades_exit_after_entry", sql`${t.exitAt} > ${t.entryAt}`),
    check("trades_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("trades_side_valid", sql`${t.side} IN ('long', 'short')`),
    check("trades_symbol_length", sql`char_length(${t.symbol}) BETWEEN 1 AND 20`),
    check("trades_notes_length", sql`${t.notes} IS NULL OR char_length(${t.notes}) <= 1000`),
    check("trades_tags_known", sql`${t.tags} <@ ARRAY[${knownTags}]::text[]`),
    index("trades_user_exit_idx").on(t.userId, t.exitAt),
  ],
);

export const sessionReviews = pgTable(
  "session_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionDate: date("session_date").notNull(), // D4: calendar date in APP_TIMEZONE
    review: jsonb("review").notNull(), // validated against the F7 schema before saving
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("session_reviews_user_date_unique").on(t.userId, t.sessionDate)],
);
