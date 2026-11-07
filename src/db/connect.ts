import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";

/** Creates a Drizzle client over Neon's HTTP driver. The caller chooses the URL. */
export function connect(url: string) {
  return drizzle(neon(url), { schema });
}

export type Db = ReturnType<typeof connect>;
