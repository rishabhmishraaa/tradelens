import { eq, sql } from "drizzle-orm";
import type { Db } from "./connect.ts";
import { trades, users } from "./schema.ts";
import { demoTrades } from "./seed-data.ts";

/**
 * F2.5: idempotent. Upserts the two users and replaces only the demo user's trades,
 * in one batch (Neon runs a batch as a single transaction). The owner's data is never touched.
 */
export async function seed(db: Db) {
  await db.batch([
    db
      .insert(users)
      .values([
        { id: "owner", name: "Owner" },
        { id: "demo", name: "Demo trader" },
      ])
      .onConflictDoUpdate({ target: users.id, set: { name: sql`excluded.name` } }),
    db.delete(trades).where(eq(trades.userId, "demo")),
    db.insert(trades).values(demoTrades()),
  ]);
}
