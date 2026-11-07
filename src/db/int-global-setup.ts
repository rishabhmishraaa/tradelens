import { resetTestDatabase } from "./reset.ts";

/** Runs once before [Int] tests: wipe, migrate (F2.4: from an empty database) and seed the test branch. */
export default async function setup() {
  await resetTestDatabase();
}
