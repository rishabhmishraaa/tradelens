import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { trades } from "@/db/schema";
import { isOwner } from "./auth/session";
import { db } from "./db";

export type Trade = typeof trades.$inferSelect;

/** D11: who is looking. The owner sees owner data; everyone else sees the demo account, read-only. */
export async function viewer(): Promise<{ userId: "owner" | "demo"; canWrite: boolean }> {
  return (await isOwner()) ? { userId: "owner", canWrite: true } : { userId: "demo", canWrite: false };
}

/** F4.5 / F4.6: newest exit first, optionally limited to a UTC range [start, end). */
export async function listTrades(userId: string, range?: { start: Date; end: Date } | null): Promise<Trade[]> {
  const conditions = [eq(trades.userId, userId)];
  if (range) conditions.push(gte(trades.exitAt, range.start), lt(trades.exitAt, range.end));
  return db()
    .select()
    .from(trades)
    .where(and(...conditions))
    .orderBy(desc(trades.exitAt), desc(trades.id));
}

/** Always scoped by user, so an id from another account returns null. */
export async function getTrade(userId: string, id: string): Promise<Trade | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db()
    .select()
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.id, id)))
    .limit(1);
  return rows[0] ?? null;
}
