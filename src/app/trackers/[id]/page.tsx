import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CheckInForm } from "@/components/check-in-form";
import { TrackerHistory, type HistoryLog } from "@/components/tracker-history";
import { TrackerSettings } from "@/components/tracker-settings";
import { getTracker } from "@/lib/queries";
import { mediaUrlFor, toDateKey } from "@/lib/entry-display";

export default async function TrackerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tracker = await getTracker(id);
  if (!tracker) notFound();

  const logs: HistoryLog[] = tracker.logs.map((l) => ({
    id: l.id,
    dateKey: toDateKey(l.logDate),
    boolValue: l.boolValue,
    numValue: l.numValue,
    textValue: l.textValue,
    note: l.note,
    images: l.attachments
      .filter((a) => a.kind === "IMAGE")
      .map((a) => ({ id: a.id, url: mediaUrlFor(a.storageKey) })),
  }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = tracker.logs.filter((l) => l.logDate >= thirtyDaysAgo).length;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/trackers"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Trackers
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{tracker.name}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{tracker.cadence.toLowerCase()}</span>
          {" · "}
          {tracker.logType === "BINARY"
            ? "done / not done"
            : tracker.logType === "NUMBER"
              ? `number${tracker.unit ? ` in ${tracker.unit}` : ""}`
              : "note"}
          {" · "}
          {tracker.cadence === "DAILY"
            ? `${recent} of the last 30 days`
            : `${recent} check-ins in the last 30 days`}
          {" · "}
          {tracker._count.logs} total
        </p>
      </div>

      <TrackerSettings
        tracker={{
          id: tracker.id,
          name: tracker.name,
          cadence: tracker.cadence,
          logType: tracker.logType,
          unit: tracker.unit,
          archived: Boolean(tracker.archivedAt),
        }}
        logTypeLocked={tracker._count.logs > 0}
      />

      <CheckInForm
        trackerId={tracker.id}
        logType={tracker.logType}
        unit={tracker.unit}
        cadence={tracker.cadence}
      />

      <TrackerHistory
        trackerId={tracker.id}
        logType={tracker.logType}
        unit={tracker.unit}
        logs={logs}
      />
    </div>
  );
}
