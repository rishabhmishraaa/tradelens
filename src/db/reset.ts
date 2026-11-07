import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { connect } from "./connect.ts";
import { seed } from "./seed.ts";
import { databaseUrl } from "./targets.ts";

/** D13: wipes the TEST branch, applies all migrations and seeds it. Only ever the test target. */
export async function resetTestDatabase() {
  const db = connect(databaseUrl("test"));
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "drizzle" });
  await seed(db);
  return db;
}
