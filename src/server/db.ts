import "server-only";
import { connect, type Db } from "@/db/connect";

let client: Db | undefined;

/** The app's database client. Created on first use (never at build time) from DATABASE_URL. */
export function db(): Db {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
    client = connect(url);
  }
  return client;
}
