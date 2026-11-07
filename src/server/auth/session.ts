import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { MIN_SECRET_LENGTH, SESSION_COOKIE, sessionCookieOptions, createSessionToken, verifySessionToken } from "./token";

/** Returns the signing secret, or null if it is missing or too short (login is then disabled). */
export function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

/**
 * True when the request carries a valid owner session.
 * Reads cookies(), so callers must render inside <Suspense> (Cache Components rule).
 */
export async function isOwner(): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // Expiry depends on the current time, so this must run per request, never during prerendering.
  await connection();
  return verifySessionToken(token, secret, Date.now());
}

/** D11: every write calls this first. Hiding buttons is not protection. */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("Not authorized");
}

export async function startSession(secret: string) {
  const isHttps = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(SESSION_COOKIE, createSessionToken(secret, Date.now()), sessionCookieOptions(isHttps));
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
