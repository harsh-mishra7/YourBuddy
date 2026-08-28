import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

/**
 * The login throttle. Its bucket Map is module state shared across tests, so
 * every test uses its own key rather than relying on isolation that isn't there.
 */
describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("under-limit", 3, 60_000).ok).toBe(true);
    }
  });

  it("blocks the request after the limit is exceeded", () => {
    for (let i = 0; i < 3; i++) rateLimit("over-limit", 3, 60_000);
    const blocked = rateLimit("over-limit", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reports a retry delay no larger than the window", () => {
    for (let i = 0; i < 2; i++) rateLimit("retry-after", 1, 30_000);
    const blocked = rateLimit("retry-after", 1, 30_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(30);
    // Never advertise "retry in 0 seconds" — a client would busy-loop.
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("keeps separate counters per key", () => {
    for (let i = 0; i < 3; i++) rateLimit("key-a", 3, 60_000);
    expect(rateLimit("key-a", 3, 60_000).ok).toBe(false);
    // A different account must not be locked out by someone else's attempts.
    expect(rateLimit("key-b", 3, 60_000).ok).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    for (let i = 0; i < 3; i++) rateLimit("window", 3, 60_000);
    expect(rateLimit("window", 3, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit("window", 3, 60_000).ok).toBe(true);
  });

  it("does not reset the window just because a blocked request arrived", () => {
    for (let i = 0; i < 2; i++) rateLimit("no-extend", 2, 60_000);
    expect(rateLimit("no-extend", 2, 60_000).ok).toBe(false);

    // 30s in: still inside the original window, still blocked.
    vi.advanceTimersByTime(30_000);
    expect(rateLimit("no-extend", 2, 60_000).ok).toBe(false);

    // Past the original 60s window: allowed again. If a blocked attempt had
    // pushed resetAt forward, an attacker could never be let back in — and
    // neither could the legitimate owner of the account.
    vi.advanceTimersByTime(30_002);
    expect(rateLimit("no-extend", 2, 60_000).ok).toBe(true);
  });
});

describe("resetRateLimit", () => {
  it("clears the counter so a legitimate sign-in starts clean", () => {
    for (let i = 0; i < 3; i++) rateLimit("reset-me", 3, 60_000);
    expect(rateLimit("reset-me", 3, 60_000).ok).toBe(false);

    resetRateLimit("reset-me");
    expect(rateLimit("reset-me", 3, 60_000).ok).toBe(true);
  });

  it("is harmless for a key that was never used", () => {
    expect(() => resetRateLimit("never-seen")).not.toThrow();
  });
});
