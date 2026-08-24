"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createTracker, updateTracker } from "@/app/actions/trackers";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

type Cadence = "DAILY" | "OCCASIONAL";
type LogType = "BINARY" | "NUMBER" | "TEXT";

const LOG_TYPE_HINT: Record<LogType, string> = {
  BINARY: "One tap: done or not. History shows a grid of days.",
  NUMBER: "A value — reps, minutes, pages, kg. History shows a chart.",
  TEXT: "A free-form line. History shows a list.",
};

const CADENCE_HINT: Record<Cadence, string> = {
  DAILY: "Something you intend to do each day.",
  OCCASIONAL: "Logged only when it happens. No daily expectation, no gaps to feel bad about.",
};

export function TrackerForm({
  existing,
  logTypeLocked = false,
  onDone,
}: {
  existing?: {
    id: string;
    name: string;
    cadence: Cadence;
    logType: LogType;
    unit: string | null;
  };
  logTypeLocked?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(Boolean(existing));
  const [name, setName] = useState(existing?.name ?? "");
  const [cadence, setCadence] = useState<Cadence>(existing?.cadence ?? "DAILY");
  const [logType, setLogType] = useState<LogType>(existing?.logType ?? "BINARY");
  const [unit, setUnit] = useState(existing?.unit ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const fd = new FormData();
    fd.set("name", name);
    fd.set("cadence", cadence);
    fd.set("logType", logType);
    fd.set("unit", unit);

    startTransition(async () => {
      const result = existing
        ? await updateTracker(existing.id, fd)
        : await createTracker(fd);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(existing ? "Tracker updated" : `“${name}” created`);
      if (!existing) {
        setName("");
        setUnit("");
        setCadence("DAILY");
        setLogType("BINARY");
        setOpen(false);
      }
      onDone?.();
      router.refresh();
    });
  }

  if (!open && !existing) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus />
        New tracker
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <Label htmlFor="tracker-name">Name</Label>
        <Input
          id="tracker-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gym, Reading, Squat weight…"
          disabled={pending}
          autoFocus={!existing}
        />
      </div>

      {/* The two choices are independent — six combinations, no special
          cases (§4). Both are picked once, here. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tracker-cadence">Cadence</Label>
          <Select
            id="tracker-cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            disabled={pending}
          >
            <option value="DAILY">Daily</option>
            <option value="OCCASIONAL">Occasional</option>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {CADENCE_HINT[cadence]}
          </p>
        </div>

        <div>
          <Label htmlFor="tracker-logtype">What a check-in records</Label>
          <Select
            id="tracker-logtype"
            value={logType}
            onChange={(e) => setLogType(e.target.value as LogType)}
            disabled={pending || logTypeLocked}
          >
            <option value="BINARY">Done / not done</option>
            <option value="NUMBER">A number</option>
            <option value="TEXT">A note</option>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {logTypeLocked
              ? "Locked — this tracker already has check-ins, and switching type would leave the history holding two incompatible shapes."
              : LOG_TYPE_HINT[logType]}
          </p>
        </div>
      </div>

      {logType === "NUMBER" ? (
        <div className="max-w-40">
          <Label htmlFor="tracker-unit">Unit</Label>
          <Input
            id="tracker-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, min, pages"
            disabled={pending}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            “80” alone is meaningless.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {!existing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {existing ? "Save changes" : "Create tracker"}
        </Button>
      </div>
    </form>
  );
}
