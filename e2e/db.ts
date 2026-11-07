// Direct access to the TEST database from E2E tests, to check what the UI really saved.
import { connect } from "../src/db/connect.ts";
import { databaseUrl } from "../src/db/targets.ts";

export const testDb = () => connect(databaseUrl("test"));
