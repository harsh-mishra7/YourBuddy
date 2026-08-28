import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";

// scrypt is deliberately slow (~100ms per derivation, and verify does one too),
// so these get more room than vitest's 5s default.
const SLOW = 20_000;

describe("hashPassword", () => {
  it("encodes the cost parameters inside the hash", () => {
    // Parameters live in the string so they can be raised later without
    // invalidating every existing hash.
    return hashPassword("correct horse battery").then((hash) => {
      const parts = hash.split("$");
      expect(parts).toHaveLength(6);
      expect(parts[0]).toBe("scrypt");
      expect(Number(parts[1])).toBeGreaterThanOrEqual(32_768);
    });
  }, SLOW);

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // Both must still verify — the salt travels with the hash.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  }, SLOW);
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  }, SLOW);

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong horse battery", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  }, SLOW);

  it("rejects a null hash — an account with no password is never signable-into", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
  }, SLOW);

  it("rejects malformed stored hashes instead of throwing", async () => {
    const malformed = [
      "",
      "notascrypthash",
      "scrypt$1$2$3",
      "bcrypt$32768$8$1$c2FsdA==$a2V5",
      "scrypt$notanumber$8$1$c2FsdA==$a2V5",
    ];
    for (const stored of malformed) {
      expect(await verifyPassword("anything", stored)).toBe(false);
    }
  }, SLOW);

  it("normalises unicode, so the same password typed on a phone still matches", async () => {
    // U+00E9 vs "e" + U+0301 — visually identical, different bytes.
    const composed = "café-password";
    const decomposed = "café-password";
    expect(composed).not.toBe(decomposed);

    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  }, SLOW);
});

describe("needsRehash", () => {
  it("is false for a hash made with the current parameters", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(needsRehash(hash)).toBe(false);
  }, SLOW);

  it("is true for a hash made with weaker parameters", () => {
    expect(needsRehash("scrypt$16384$8$1$c2FsdA==$a2V5")).toBe(true);
  });

  it("is true for anything not in the current format", () => {
    expect(needsRehash("bcrypt$2b$12$whatever")).toBe(true);
    expect(needsRehash("garbage")).toBe(true);
  });

  it("is false for a null hash — there is nothing to upgrade", () => {
    expect(needsRehash(null)).toBe(false);
  });
});
