import { describe, expect, it } from "vitest";

import {
  entryInput,
  normalizeEmail,
  parseLocalDateTime,
  safeNextPath,
  signUpInput,
  trackerInput,
} from "@/lib/validation";

/**
 * `safeNextPath` guards `?next=`, which comes straight off the URL. Without it
 * a crafted link sends someone through a real login onto an attacker's page,
 * carrying the trust of having just typed their password.
 */
describe("safeNextPath", () => {
  it("falls back to the root for blank input", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("allows an ordinary in-site path", () => {
    expect(safeNextPath("/trackers")).toBe("/trackers");
    expect(safeNextPath("/entry/abc?x=1")).toBe("/entry/abc?x=1");
  });

  it("rejects an absolute URL", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("http://evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects protocol-relative paths", () => {
    // "//host" and "/\host" both leave the site despite starting with a slash.
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });

  it("rejects a bounce back to the auth pages", () => {
    // Otherwise a successful sign-in lands you on the login form again.
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/signup?next=/x")).toBe("/");
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases so one person cannot become two accounts", () => {
    expect(normalizeEmail("  Harsh@Example.COM ")).toBe("harsh@example.com");
    expect(normalizeEmail("harsh@example.com")).toBe("harsh@example.com");
  });
});

describe("signUpInput", () => {
  const valid = {
    name: "Harsh",
    email: "harsh@example.com",
    password: "correct horse battery",
  };

  it("accepts a well-formed signup", () => {
    expect(signUpInput.safeParse(valid).success).toBe(true);
  });

  it("rejects a password under the minimum length", () => {
    const result = signUpInput.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(signUpInput.safeParse({ ...valid, email: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects a blank name, including one that is only whitespace", () => {
    expect(signUpInput.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });
});

describe("entryInput", () => {
  it("accepts an entry with only a body", () => {
    expect(entryInput.safeParse({ body: "something" }).success).toBe(true);
  });

  it("accepts an entry with only a title", () => {
    expect(entryInput.safeParse({ title: "a title" }).success).toBe(true);
  });

  it("rejects an entry that is empty in both fields", () => {
    expect(entryInput.safeParse({ body: "   ", title: "  " }).success).toBe(
      false,
    );
    expect(entryInput.safeParse({}).success).toBe(false);
  });

  it("treats an empty entryDate as the undated shelf", () => {
    const result = entryInput.safeParse({ body: "x", entryDate: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date key", () => {
    expect(
      entryInput.safeParse({ body: "x", entryDate: "24-08-2026" }).success,
    ).toBe(false);
    expect(
      entryInput.safeParse({ body: "x", entryDate: "2026-8-4" }).success,
    ).toBe(false);
  });

  it("accepts a well-formed date key", () => {
    expect(
      entryInput.safeParse({ body: "x", entryDate: "2026-08-24" }).success,
    ).toBe(true);
  });
});

describe("trackerInput", () => {
  const base = { name: "Weight", cadence: "DAILY" as const };

  it("requires a unit for a NUMBER tracker", () => {
    // "80" alone is meaningless — kilos, minutes, or pages?
    expect(
      trackerInput.safeParse({ ...base, logType: "NUMBER" }).success,
    ).toBe(false);
    expect(
      trackerInput.safeParse({ ...base, logType: "NUMBER", unit: "kg" }).success,
    ).toBe(true);
  });

  it("does not require a unit for other log types", () => {
    expect(trackerInput.safeParse({ ...base, logType: "BINARY" }).success).toBe(
      true,
    );
    expect(trackerInput.safeParse({ ...base, logType: "TEXT" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown cadence or log type", () => {
    expect(
      trackerInput.safeParse({ ...base, cadence: "HOURLY", logType: "TEXT" })
        .success,
    ).toBe(false);
    expect(
      trackerInput.safeParse({ ...base, logType: "COLOUR" }).success,
    ).toBe(false);
  });
});

describe("parseLocalDateTime", () => {
  it("returns null for a blank value", () => {
    expect(parseLocalDateTime("")).toBeNull();
  });

  it("returns null for an unparseable value", () => {
    expect(parseLocalDateTime("not a date")).toBeNull();
  });

  it("parses a datetime-local value", () => {
    const parsed = parseLocalDateTime("2026-08-24T14:30");
    expect(parsed).toBeInstanceOf(Date);
    expect(Number.isNaN(parsed!.getTime())).toBe(false);
  });
});
