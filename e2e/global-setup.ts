import { resetTestDatabase } from "../src/db/reset.ts";

/** Before E2E: wipe, migrate and seed the Neon TEST branch (D13). Skipped when testing a live site. */
export default async function globalSetup() {
  if (process.env.BASE_URL) return;
  await resetTestDatabase();
}
