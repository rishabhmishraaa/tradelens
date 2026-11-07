import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, createSessionToken, sessionCookieOptions, verifySessionToken } from "./token";

const SECRET = "a".repeat(32);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);

describe("F3.3 signed session token", () => {
  it("F3.3 accepts an untouched token", () => {
    expect(verifySessionToken(createSessionToken(SECRET, NOW), SECRET, NOW)).toBe(true);
  });

  it("F3.3 rejects a token whose payload was edited (e.g. expiry pushed out)", () => {
    const [, signature] = createSessionToken(SECRET, NOW).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "owner", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, SECRET, NOW)).toBe(false);
  });

  it("F3.3 rejects a token with a changed signature", () => {
    const token = createSessionToken(SECRET, NOW);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifySessionToken(flipped, SECRET, NOW)).toBe(false);
  });

  it("F3.3 rejects a token signed with a different secret", () => {
    expect(verifySessionToken(createSessionToken("b".repeat(32), NOW), SECRET, NOW)).toBe(false);
  });

  it("F3.3 rejects missing and malformed values", () => {
    for (const bad of [undefined, "", "abc", "a.b.c", ".", "x."]) {
      expect(verifySessionToken(bad, SECRET, NOW)).toBe(false);
    }
  });
});

describe("F3.4 session expiry", () => {
  it("F3.4 is valid just before 7 days and invalid at 7 days", () => {
    const token = createSessionToken(SECRET, NOW);
    const sevenDaysMs = SESSION_MAX_AGE_SECONDS * 1000;
    expect(verifySessionToken(token, SECRET, NOW + sevenDaysMs - 1000)).toBe(true);
    expect(verifySessionToken(token, SECRET, NOW + sevenDaysMs)).toBe(false);
  });
});

describe("F3.2 cookie attributes", () => {
  it("F3.2 is httpOnly, SameSite=Lax, 7 days, and Secure only over HTTPS", () => {
    expect(sessionCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
