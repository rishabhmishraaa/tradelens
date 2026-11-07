import { eq, sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { MISTAKE_TAGS } from "@/lib/mistake-tags";
import { connect, type Db } from "./connect";
import { sessionReviews, trades } from "./schema";
import { seed } from "./seed";
import { databaseUrl } from "./targets";

let db: Db;
beforeAll(() => {
  db = connect(databaseUrl("test"));
});

/** A valid owner trade; each constraint test breaks exactly one field. */
const validTrade = {
  userId: "owner",
  symbol: "TEST",
  side: "long" as const,
  entryPrice: "100",
  exitPrice: "110",
  quantity: "1",
  fees: "1",
  currency: "INR",
  entryAt: new Date("2026-10-01T04:00:00Z"),
  exitAt: new Date("2026-10-01T05:00:00Z"),
  tags: [] as string[],
};

/** Drizzle wraps driver errors; the Postgres message (with the constraint name) is on `cause`. */
async function rejectionMessage(query: Promise<unknown>): Promise<string> {
  try {
    await query;
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return `${err.message} ${err.cause?.message ?? ""}`;
  }
  throw new Error("Expected the database to reject this insert, but it succeeded.");
}

afterEach(async () => {
  await db.delete(trades).where(eq(trades.userId, "owner"));
  await db.delete(sessionReviews);
});

describe("F2.2 database constraints", () => {
  it("F2.2 accepts a valid trade (control)", async () => {
    await expect(db.insert(trades).values(validTrade)).resolves.toBeDefined();
  });

  const cases: [string, Partial<typeof validTrade>, string][] = [
    ["quantity must be > 0", { quantity: "0" }, "trades_quantity_positive"],
    ["entry price must be > 0", { entryPrice: "0" }, "trades_entry_price_positive"],
    ["exit price must be > 0", { exitPrice: "-5" }, "trades_exit_price_positive"],
    ["fees must be >= 0", { fees: "-0.01" }, "trades_fees_non_negative"],
    ["exit must be after entry", { exitAt: new Date("2026-10-01T04:00:00Z") }, "trades_exit_after_entry"],
    ["currency must be 3 uppercase letters", { currency: "inr" }, "trades_currency_iso"],
    ["tags must come from the fixed list", { tags: ["bad-luck"] }, "trades_tags_known"],
  ];
  for (const [name, override, constraint] of cases) {
    it(`F2.2 rejects: ${name}`, async () => {
      const message = await rejectionMessage(db.insert(trades).values({ ...validTrade, ...override }));
      expect(message).toContain(constraint);
    });
  }

  it("F2.2 rejects: side outside long/short", async () => {
    const message = await rejectionMessage(
      db.execute(sql`INSERT INTO trades (user_id, symbol, side, entry_price, exit_price, quantity, currency, entry_at, exit_at)
        VALUES ('owner', 'TEST', 'sideways', 100, 110, 1, 'INR', '2026-10-01T04:00:00Z', '2026-10-01T05:00:00Z')`),
    );
    expect(message).toContain("trades_side_valid");
  });
});

describe("F2.3 session reviews", () => {
  it("F2.3 allows only one review per user per session date", async () => {
    const review = { userId: "demo", sessionDate: "2026-10-05", review: { summary: "x" }, model: "test-model" };
    await db.insert(sessionReviews).values(review);
    const message = await rejectionMessage(db.insert(sessionReviews).values(review));
    expect(message).toContain("session_reviews_user_date_unique");
  });
});

describe("F2.4 migrations", () => {
  it("F2.4 created all tables on an empty database (global setup dropped the schema first)", async () => {
    const result = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(result.rows.map((r) => r.table_name)).toEqual(["session_reviews", "trades", "users"]);
  });
});

describe("F2.5 seed", () => {
  const snapshot = () =>
    db.execute(sql`SELECT id, symbol, side, entry_price, exit_price, quantity, fees, currency, entry_at, exit_at, tags, notes
      FROM trades WHERE user_id = 'demo' ORDER BY id`);

  it("F2.5 is idempotent and leaves the owner's trades alone", async () => {
    await db.insert(trades).values(validTrade);
    const before = await snapshot();
    await seed(db);
    const after = await snapshot();
    expect(after.rows).toEqual(before.rows);
    const owner = await db.select().from(trades).where(eq(trades.userId, "owner"));
    expect(owner).toHaveLength(1);
  });

  it("F2.5 restores demo trades that were changed or deleted (re-seed replaces, not skips)", async () => {
    const before = await snapshot();
    await db.execute(sql`UPDATE trades SET symbol = 'EDITED' WHERE id = ${before.rows[0].id}`);
    await db.execute(sql`DELETE FROM trades WHERE id = ${before.rows[1].id}`);
    await seed(db);
    const after = await snapshot();
    expect(after.rows).toEqual(before.rows);
  });

  it("F2.5 creates the owner and demo users", async () => {
    const result = await db.execute(sql`SELECT id FROM users ORDER BY id`);
    expect(result.rows.map((r) => r.id)).toEqual(["demo", "owner"]);
  });

  it("F2.5 has >= 40 demo trades over >= 8 sessions in INR and USD", async () => {
    const result = await db.execute(sql`SELECT
        count(*)::int AS trades,
        count(DISTINCT (exit_at AT TIME ZONE 'Asia/Kolkata')::date)::int AS sessions,
        array_agg(DISTINCT currency ORDER BY currency) AS currencies
      FROM trades WHERE user_id = 'demo'`);
    const row = result.rows[0];
    expect(row.trades).toBeGreaterThanOrEqual(40);
    expect(row.sessions).toBeGreaterThanOrEqual(8);
    expect(row.currencies).toEqual(["INR", "USD"]);
  });

  it("F2.5 includes wins, losses and at least one breakeven (net = gross - fees, D2)", async () => {
    const result = await db.execute(sql`SELECT
        count(*) FILTER (WHERE net > 0)::int AS wins,
        count(*) FILTER (WHERE net < 0)::int AS losses,
        count(*) FILTER (WHERE net = 0)::int AS breakevens
      FROM (
        SELECT CASE WHEN side = 'long' THEN (exit_price - entry_price) * quantity
                    ELSE (entry_price - exit_price) * quantity END - fees AS net
        FROM trades WHERE user_id = 'demo'
      ) t`);
    const row = result.rows[0] as { wins: number; losses: number; breakevens: number };
    expect(row.wins).toBeGreaterThan(0);
    expect(row.losses).toBeGreaterThan(0);
    expect(row.breakevens).toBeGreaterThanOrEqual(1);
  });

  it("F2.5 uses every mistake tag at least once", async () => {
    const result = await db.execute(
      sql`SELECT DISTINCT unnest(tags) AS tag FROM trades WHERE user_id = 'demo' ORDER BY tag`,
    );
    expect(result.rows.map((r) => r.tag)).toEqual([...MISTAKE_TAGS].sort());
  });
});
