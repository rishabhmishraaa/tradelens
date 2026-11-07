// D10: the session cookie value is `<payload>.<signature>`, signed with HMAC-SHA256.
// Pure functions (no cookies(), no clock) so tamper and expiry rules are unit-tested (F3.3, F3.4).
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tl_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const MIN_SECRET_LENGTH = 32;

type Payload = { sub: "owner"; exp: number }; // exp = unix seconds

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function createSessionToken(secret: string, nowMs: number): string {
  const payload: Payload = { sub: "owner", exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

/** True only for an untampered, unexpired owner token signed with this secret. */
export function verifySessionToken(token: string | undefined, secret: string, nowMs: number): boolean {
  if (!token) return false;
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra !== undefined) return false;

  const expected = Buffer.from(sign(data, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Partial<Payload>;
    return payload.sub === "owner" && typeof payload.exp === "number" && payload.exp * 1000 > nowMs;
  } catch {
    return false;
  }
}

/** F3.2: cookie attributes. Secure whenever the request came in over HTTPS. */
export function sessionCookieOptions(isHttps: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
