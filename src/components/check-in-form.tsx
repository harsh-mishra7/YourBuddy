"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logCheckIn } from "@/app/actions/trackers";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { ImagePicker } from "@/components/image-picker";
import { todayKey } from "@/lib/entry-display";

/**
 * One check-in. The optional note is the part that matters most later — a bare
 * "done" records that you went, a note records how it went, and that's what
 * effort-vs-outcome analysis runs on (§4).
 */
export function CheckInForm({
  trackerId,
  logType,
  unit,
  cadence,
  uploadsEnabled = false,
}: {
  trackerId: string;
  logType: "BINARY" | "NUMBER" | "TEXT";
  unit: string | null;
  cadence: "DAILY" | "OCCASIONAL";
  /** Resolved on the server — see `src/lib/uploads.ts` for why it's off by default. */
  uploadsEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [logDate, setLogDate] = useState(todayKey());
  const [numValue, setNumValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<File[]>([]);

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const fd = new FormData();
    fd.set("trackerId", trackerId);
    fd.set("logDate", logDate);
    fd.set("note", note);
    if (logType === "BINARY") fd.set("boolValue", "true");
    if (logType === "NUMBER") fd.set("numValue", numValue);
    if (logType === "TEXT") fd.set("textValue", textValue);
    images.forEach((f) => fd.append("images", f));

    startTransition(async () => {
      const result = await logCheckIn(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Logged");
      setNumValue("");
      setTextValue("");
      setNote("");
      setImages([]);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            disabled={pending}
            className="h-9 w-auto text-sm"
          />
        </div>

        {logType === "NUMBER" ? (
          <div>
            <Label htmlFor="log-num">Value{unit ? ` (${unit})` : ""}</Label>
            <Input
              id="log-num"
              type="number"
              step="any"
              inputMode="decimal"
              value={numValue}
              onChange={(e) => setNumValue(e.target.value)}
              placeholder={unit ?? "0"}
              disabled={pending}
              className="h-9 w-32 text-sm"
            />
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          {logType === "BINARY" ? "Mark done" : "Log it"}
        </Button>

        {cadence === "DAILY" ? (
          <span className="text-xs text-muted-foreground">
            One check-in per day — logging again edits that day.
          </span>
        ) : null}
      </div>

      {logType === "TEXT" ? (
        <div>
          <Label htmlFor="log-text">Entry</Label>
          <Textarea
            id="log-text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="What happened?"
            rows={2}
            disabled={pending}
            className="text-sm"
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="log-note">Note (optional)</Label>
        <Textarea
          id="log-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Felt strong today / dragged myself there…"
          rows={2}
          disabled={pending}
          className="text-sm"
        />
      </div>

      {uploadsEnabled ? (
        <ImagePicker files={images} onChange={setImages} disabled={pending} />
      ) : null}
    </form>
  );
}
