/**
 * Display helpers safe to import from both server and client components.
 *
 * `@/lib/storage` pulls in `fs`, so components that only need a media URL
 * re-export it from here instead of reaching into the storage adapter.
 */
export {
  cn,
  excerpt,
  formatBytes,
  formatDateOnly,
  formatDuration,
  formatLocalDate,
  formatTimestamp,
  fromDateKey,
  monthLabel,
  toDateKey,
  todayKey,
} from "@/lib/utils";

export function mediaUrlFor(storageKey: string): string {
  return `/api/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
