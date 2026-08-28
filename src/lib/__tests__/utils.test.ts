import { describe, expect, it } from "vitest";

import {
  excerpt,
  formatBytes,
  formatDateOnly,
  formatDuration,
  fromDateKey,
  monthLabel,
  toDateKey,
} from "@/lib/utils";

/**
 * `entryDate` and `logDate` are `@db.Date` columns, which Prisma hands back
 * pinned to UTC midnight. Reading them with local-time getters shifts them a
 * day backwards for anyone west of UTC, so these helpers must stay in UTC.
 */
describe("date-only helpers", () => {
  it("formats a UTC-midnight date as its key", () => {
    expect(toDateKey(new Date("2026-08-24T00:00:00.000Z"))).toBe("2026-08-24");
  });

  it("parses a key to UTC midnight, not local midnight", () => {
    expect(fromDateKey("2026-08-24").toISOString()).toBe(
      "2026-08-24T00:00:00.000Z",
    );
  });

  it("round-trips", () => {
    for (const key of ["2026-01-01", "2026-08-24", "2026-12-31"]) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });

  it("does not slip a day for a time late in the UTC day", () => {
    // The bug this guards: a local-time getter west of UTC would call this
    // the 23rd.
    expect(toDateKey(new Date("2026-08-24T23:59:59.000Z"))).toBe("2026-08-24");
  });

  it("formats a date-only value in UTC terms", () => {
    expect(formatDateOnly(fromDateKey("2026-08-24"))).toBe("24 Aug 2026");
  });

  it("labels the month a date-only value belongs to", () => {
    expect(monthLabel(fromDateKey("2026-08-24"))).toBe("August 2026");
    // Boundary: UTC midnight on the 1st must not fall into the prior month.
    expect(monthLabel(fromDateKey("2026-08-01"))).toBe("August 2026");
  });
});

describe("formatDuration", () => {
  it("pads seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
    expect(formatDuration(9)).toBe("0:09");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(65.9)).toBe("1:05");
  });

  it("returns a zero clock for missing or negative input", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("formatBytes", () => {
  it("picks a unit by magnitude", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("switches unit exactly at the boundary", () => {
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 - 1)).toBe("1024 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("excerpt", () => {
  it("collapses whitespace onto one line", () => {
    expect(excerpt("a\n\n  b\tc")).toBe("a b c");
  });

  it("passes short bodies through", () => {
    expect(excerpt("short")).toBe("short");
  });

  it("truncates with an ellipsis and no trailing space", () => {
    const out = excerpt(`${"a".repeat(50)} ${"b".repeat(200)}`, 51);
    expect(out).toBe(`${"a".repeat(50)}…`);
  });

  it("does not truncate at exactly the limit", () => {
    expect(excerpt("a".repeat(10), 10)).toBe("a".repeat(10));
    expect(excerpt("a".repeat(11), 10)).toBe(`${"a".repeat(10)}…`);
  });

  it("returns empty for whitespace-only input", () => {
    expect(excerpt("   \n  ")).toBe("");
  });
});
