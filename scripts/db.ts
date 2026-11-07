// Usage: npm run db:migrate [-- --test] | npm run db:seed [-- --test] | npm run db:reset:test
// Run directly by Node 26 (TypeScript type stripping), so imports are relative with .ts extensions.
import { migrate } from "drizzle-orm/neon-http/migrator";
import { connect } from "../src/db/connect.ts";
import { resetTestDatabase } from "../src/db/reset.ts";
import { seed } from "../src/db/seed.ts";
import { databaseUrl } from "../src/db/targets.ts";

const [command, ...flags] = process.argv.slice(2);
const target = flags.includes("--test") ? "test" : "main";

if (command === "migrate") {
  await migrate(connect(databaseUrl(target)), { migrationsFolder: "drizzle" });
  console.log(`Migrations applied (${target}).`);
} else if (command === "seed") {
  await seed(connect(databaseUrl(target)));
  console.log(`Seeded (${target}).`);
} else if (command === "reset" && target === "test") {
  await resetTestDatabase();
  console.log("Test database reset, migrated and seeded.");
} else {
  console.error("Unknown command. Use: migrate | seed | reset --test");
  process.exit(1);
}
