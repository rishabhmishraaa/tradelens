import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("F3.5 password hashing (scrypt)", () => {
  it("F3.5 verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("F3.5 never stores the plain password and salts every hash", async () => {
    const a = await hashPassword("same password here");
    const b = await hashPassword("same password here");
    expect(a).not.toContain("same password here");
    expect(a).not.toBe(b);
  });

  it("F3.5 uses a format with no '$' (Next.js would expand it inside .env files)", async () => {
    const hash = await hashPassword("any password value");
    expect(hash).not.toContain("$");
    expect(hash.split(":")).toHaveLength(6);
    expect(hash.startsWith("scrypt:16384:8:1:")).toBe(true);
  });

  it("F3.5 returns false instead of throwing for malformed hashes", async () => {
    for (const bad of ["", "nonsense", "scrypt:16384:8:1:onlysalt", "bcrypt:1:2:3:abc:def", "scrypt:x:8:1:abc:def"]) {
      expect(await verifyPassword("whatever", bad)).toBe(false);
    }
  });
});
