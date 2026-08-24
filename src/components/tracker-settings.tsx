"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTracker, setTrackerArchived } from "@/app/actions/trackers";
import { Button } from "@/components/ui/button";
import { TrackerForm } from "@/components/tracker-form";

export function TrackerSettings({
  tracker,
  logTypeLocked,
}: {
  tracker: {
    id: string;
    name: string;
    cadence: "DAILY" | "OCCASIONAL";
    logType: "BINARY" | "NUMBER" | "TEXT";
    unit: string | null;
    archived: boolean;
  };
  logTypeLocked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, to?: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(msg);
      if (to) router.push(to);
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <TrackerForm
          existing={tracker}
          logTypeLocked={logTypeLocked}
          onDone={() => setEditing(false)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setEditing(false)}
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Settings2 />
        Edit
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            () => setTrackerArchived(tracker.id, !tracker.archived),
            tracker.archived ? "Tracker restored" : "Tracker archived",
          )
        }
      >
        {tracker.archived ? <ArchiveRestore /> : <Archive />}
        {tracker.archived ? "Restore" : "Archive"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-danger"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Delete “${tracker.name}” and all its check-ins? This can't be undone.`,
            )
          )
            return;
          run(() => deleteTracker(tracker.id), "Tracker deleted", "/trackers");
        }}
      >
        <Trash2 />
        Delete
      </Button>
    </div>
  );
}
