import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date-only helpers.
 *
 * `entryDate` and `logDate` are `@db.Date` columns, which Prisma hands back as
 * a Date pinned to UTC midnight. Formatting those with local-time getters can
 * shift them a day backwards for anyone west of UTC, so date-only values are
 * always read and written in UTC terms.
 */

/** "2026-08-24" for a date-only column. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse "2026-08-24" into the UTC-midnight Date a @db.Date column expects. */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Today, in the viewer's local calendar, as a date-only key. */
export function todayKey(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "24 Aug 2026" — for date-only columns. */
export function formatDateOnly(date: Date): string {
  return DATE_FMT.format(date);
}

/** Grouping label for the timeline: "August 2026". */
export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "24 Aug 2026" for a real timestamp, read in the viewer's local timezone. */
export function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "24 Aug 2026, 14:32" — for real timestamps, shown in local time. */
export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** First line of the body, for list previews when there's no title. */
export function excerpt(body: string, max = 180): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}
