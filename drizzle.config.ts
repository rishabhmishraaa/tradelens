import { defineConfig } from "drizzle-kit";

// Only used by `npm run db:generate` (creates SQL migrations from the schema; needs no database).
// Migrations are applied by scripts/db.ts, which picks main or test explicitly.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
