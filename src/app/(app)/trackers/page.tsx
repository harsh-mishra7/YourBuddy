import Link from "next/link";
import { Target } from "lucide-react";
import { TrackerCard, type TrackerCardData } from "@/components/tracker-card";
import { TrackerForm } from "@/components/tracker-form";
import { EmptyState } from "@/components/ui/card";
import { getTrackers } from "@/lib/queries";
import { toDateKey, todayKey } from "@/lib/utils";

export default async function TrackersPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const trackers = await getTrackers(showArchived);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const today = todayKey();

  const cards: TrackerCardData[] = trackers.map((t) => {
    const recent = t.logs.filter((l) => l.logDate >= thirtyDaysAgo);
    const newest = t.logs[0];

    const latest =
      t.logType === "NUMBER" && newest?.numValue !== null && newest
        ? `${newest.numValue}${t.unit ? ` ${t.unit}` : ""}`
        : null;

    return {
      id: t.id,
      name: t.name,
      cadence: t.cadence,
      logType: t.logType,
      unit: t.unit,
      archived: Boolean(t.archivedAt),
      doneToday: t.logs.some(
        (l) => toDateKey(l.logDate) === today && l.boolValue === true,
      ),
      recentCount: recent.length,
      latest,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Trackers</h1>
        <p className="text-sm text-muted-foreground">
          What you did — so the journal can stay about how it went.
        </p>
      </div>

      <TrackerForm />

      {cards.length === 0 ? (
        <EmptyState
          icon={<Target className="size-7" />}
          title="No trackers yet"
          hint="A tracker is two choices made once: how often it's expected, and what a single check-in records."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((t) => (
            <TrackerCard key={t.id} tracker={t} />
          ))}
        </div>
      )}

      <Link
        href={showArchived ? "/trackers" : "/trackers?archived=1"}
        className="w-fit text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showArchived ? "Hide archived" : "Show archived"}
      </Link>
    </div>
  );
}
