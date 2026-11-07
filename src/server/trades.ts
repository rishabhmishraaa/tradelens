import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { sessionReviews, trades } from "@/db/schema";
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

/** Most recent exit time for a user, or null when they have no trades (F6.1 default range). */
export async function latestExit(userId: string): Promise<Date | null> {
  const rows = await db()
    .select({ exitAt: trades.exitAt })
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.exitAt))
    .limit(1);
  return rows[0]?.exitAt ?? null;
}

export type SessionReview = typeof sessionReviews.$inferSelect;

/** F6.2: the saved AI review for one session date, if any. */
export async function getSessionReview(userId: string, date: string): Promise<SessionReview | null> {
  const rows = await db()
    .select()
    .from(sessionReviews)
    .where(and(eq(sessionReviews.userId, userId), eq(sessionReviews.sessionDate, date)))
    .limit(1);
  return rows[0] ?? null;
}
