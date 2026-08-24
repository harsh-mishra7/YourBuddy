"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleBinaryLog } from "@/app/actions/trackers";
import { cn, todayKey } from "@/lib/entry-display";

export interface TrackerCardData {
  id: string;
  name: string;
  cadence: "DAILY" | "OCCASIONAL";
  logType: "BINARY" | "NUMBER" | "TEXT";
  unit: string | null;
  archived: boolean;
  doneToday: boolean;
  /** Check-ins in the last 30 days. */
  recentCount: number;
  /** Most recent value, already formatted for display. */
  latest: string | null;
}

export function TrackerCard({ tracker }: { tracker: TrackerCardData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isTapToLog = tracker.logType === "BINARY";

  function toggleToday() {
    startTransition(async () => {
      const result = await toggleBinaryLog(tracker.id, todayKey());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card p-3.5",
        tracker.archived && "opacity-60",
      )}
    >
      {isTapToLog ? (
        <button
          type="button"
          onClick={toggleToday}
          disabled={pending}
          aria-label={
            tracker.doneToday ? `Undo ${tracker.name} today` : `Mark ${tracker.name} done today`
          }
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
            tracker.doneToday
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
          )}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
      ) : null}

      <Link href={`/trackers/${tracker.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{tracker.name}</span>
          {tracker.archived ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="capitalize">{tracker.cadence.toLowerCase()}</span>
          <span>·</span>
          <span>
            {tracker.logType === "BINARY"
              ? "done / not done"
              : tracker.logType === "NUMBER"
                ? `number${tracker.unit ? ` (${tracker.unit})` : ""}`
                : "note"}
          </span>

          {/* A daily tracker has a denominator; an occasional one doesn't,
              so it gets a frequency instead of a percentage (§4). */}
          <span>·</span>
          <span>
            {tracker.cadence === "DAILY"
              ? `${tracker.recentCount} of last 30 days`
              : `${tracker.recentCount} in last 30 days`}
          </span>

          {tracker.latest ? (
            <>
              <span>·</span>
              <span>latest {tracker.latest}</span>
            </>
          ) : null}
        </div>
      </Link>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
