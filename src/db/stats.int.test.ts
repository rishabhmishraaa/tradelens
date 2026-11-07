import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { summarize } from "@/lib/stats";
import { connect, type Db } from "./connect";
import { trades } from "./schema";
import { databaseUrl } from "./targets";

// An independent second implementation: Postgres computes the same stats with SQL
// (numeric arithmetic and window functions), and the JS functions must agree with it.
let db: Db;
beforeAll(() => {
  db = connect(databaseUrl("test"));
});

describe("F5.7 JS stats agree with an independent SQL calculation on the seed data", () => {
  it("F5.7 counts, totals, extremes and max drawdown per currency", async () => {
    const result = await db.execute(sql`
      WITH t AS (
        SELECT id, currency, exit_at,
          CASE WHEN side = 'long' THEN (exit_price - entry_price) * quantity
               ELSE (entry_price - exit_price) * quantity END - fees AS net
        FROM trades WHERE user_id = 'demo'
      ),
      curve AS (
        -- running total of net P&L per currency, in exit order with ties by id (D5)
        SELECT currency, exit_at, id,
          SUM(net) OVER (PARTITION BY currency ORDER BY exit_at, id) AS cum
        FROM t
      ),
      dd AS (
        -- peak so far starts at 0; drawdown = peak - current
        SELECT currency, MAX(peak - cum) AS max_drawdown FROM (
          SELECT currency, cum,
            GREATEST(0, MAX(cum) OVER (PARTITION BY currency ORDER BY exit_at, id ROWS UNBOUNDED PRECEDING)) AS peak
          FROM curve
        ) p GROUP BY currency
      )
      SELECT t.currency,
        COUNT(*)::int AS trades,
        COUNT(*) FILTER (WHERE net > 0)::int AS wins,
        COUNT(*) FILTER (WHERE net < 0)::int AS losses,
        COUNT(*) FILTER (WHERE net = 0)::int AS breakevens,
        SUM(net)::float8 AS net,
        MAX(net) FILTER (WHERE net > 0)::float8 AS largest_win,
        MIN(net) FILTER (WHERE net < 0)::float8 AS largest_loss,
        GREATEST(0, MAX(dd.max_drawdown))::float8 AS max_drawdown
      FROM t JOIN dd USING (currency)
      GROUP BY t.currency ORDER BY t.currency`);

    const rows = await db.select().from(trades).where(eq(trades.userId, "demo"));
    const js = summarize(rows);

    expect(js.map((s) => s.currency)).toEqual(result.rows.map((r) => r.currency));
    js.forEach((s, i) => {
      const r = result.rows[i] as Record<string, number>;
      expect(s.trades).toBe(r.trades);
      expect(s.wins).toBe(r.wins);
      expect(s.losses).toBe(r.losses);
      expect(s.breakevens).toBe(r.breakevens);
      expect(s.net).toBeCloseTo(r.net, 6);
      expect(s.largestWin).toBeCloseTo(r.largest_win, 6);
      expect(s.largestLoss).toBeCloseTo(r.largest_loss, 6);
      expect(s.maxDrawdown).toBeCloseTo(r.max_drawdown, 6);
    });
  });
});
