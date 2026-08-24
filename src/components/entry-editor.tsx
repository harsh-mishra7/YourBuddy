"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CalendarOff,
  CalendarPlus,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAttachment,
  retryTranscription,
  updateEntry,
} from "@/app/actions/entries";
import { clearReminder, setReminder } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { ImagePicker } from "@/components/image-picker";
import { VoiceRecorder, type RecordedAudio } from "@/components/voice-recorder";
import { cn, formatBytes, formatDuration, todayKey } from "@/lib/entry-display";

export interface EditorAttachment {
  id: string;
  kind: "IMAGE" | "AUDIO";
  url: string;
  fileName: string | null;
  sizeBytes: number;
  durationSeconds: number | null;
  transcript: string | null;
  transcriptStatus: "NOT_APPLICABLE" | "PENDING" | "DONE" | "FAILED";
  transcriptError: string | null;
}

export interface EditorEntry {
  id: string;
  kind: "JOURNAL" | "THOUGHT";
  title: string;
  body: string;
  entryDateKey: string;
  createdAtISO: string;
  attachments: EditorAttachment[];
  reminder: { id: string; remindAtISO: string } | null;
}

/** ISO instant → the `YYYY-MM-DDTHH:mm` a datetime-local input wants. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function EntryEditor({ entry }: { entry: EditorEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState(entry.kind);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [entryDate, setEntryDate] = useState(entry.entryDateKey);
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);

  const [remindAt, setRemindAt] = useState(
    entry.reminder ? toLocalInputValue(entry.reminder.remindAtISO) : "",
  );

  const dated = entryDate !== "";
  const dirty =
    kind !== entry.kind ||
    title !== entry.title ||
    body !== entry.body ||
    entryDate !== entry.entryDateKey ||
    images.length > 0 ||
    audio !== null;

  function save() {
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("entryDate", entryDate);
    images.forEach((f) => fd.append("images", f));
    if (audio) {
      fd.set("audio", audio.file);
      fd.set("audioDuration", String(audio.seconds));
    }

    startTransition(async () => {
      const result = await updateEntry(entry.id, fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setImages([]);
      if (audio) URL.revokeObjectURL(audio.url);
      setAudio(null);
      toast.success("Saved");
      router.refresh();
    });
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    msg: string,
  ) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(msg);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            disabled={pending}
            className="border-0 bg-transparent px-0 text-lg font-medium"
          />

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write…"
            rows={10}
            disabled={pending}
            className="prose-entry min-h-48 border-0 bg-transparent px-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["JOURNAL", "THOUGHT"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                disabled={pending}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  kind === k
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k.toLowerCase()}
              </button>
            ))}
          </div>

          {dated ? (
            <>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                disabled={pending}
                className="h-8 w-auto py-0 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEntryDate("")}
                disabled={pending}
              >
                <CalendarOff />
                Remove date
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEntryDate(todayKey())}
              disabled={pending}
            >
              <CalendarPlus />
              Add a date
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {dirty ? (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={pending || !dirty}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Reminder */}
      <section className="rounded-xl border border-border bg-card p-4">
        <Label>Bring this back to me</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            disabled={pending}
            className="h-9 w-fit text-xs"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !remindAt}
            onClick={() =>
              run(() => setReminder(entry.id, remindAt), "Reminder set")
            }
          >
            <Bell />
            {entry.reminder ? "Update" : "Set"}
          </Button>
          {entry.reminder ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setRemindAt("");
                run(() => clearReminder(entry.id), "Reminder removed");
              }}
            >
              <BellOff />
              Clear
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          In-app only. It waits here for the next time you open YourBuddy after
          that moment.
        </p>
      </section>

      {/* Existing attachments */}
      {entry.attachments.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Label className="mb-0">Attached</Label>

          <div className="flex flex-wrap gap-2">
            {entry.attachments
              .filter((a) => a.kind === "IMAGE")
              .map((a) => (
                <figure
                  key={a.id}
                  className="group relative size-28 overflow-hidden rounded-lg border border-border"
                >
                  <Image
                    src={a.url}
                    alt={a.fileName ?? "Attached photo"}
                    fill
                    unoptimized
                    sizes="112px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteAttachment(a.id), "Photo removed")
                    }
                    aria-label="Delete photo"
                    className="absolute right-1 top-1 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </figure>
              ))}
          </div>

          {entry.attachments
            .filter((a) => a.kind === "AUDIO")
            .map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex items-center gap-3">
                  <audio
                    controls
                    src={a.url}
                    preload="metadata"
                    className="h-9 min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDuration(a.durationSeconds)} ·{" "}
                    {formatBytes(a.sizeBytes)}
                  </span>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteAttachment(a.id), "Voice note removed")
                    }
                    aria-label="Delete voice note"
                  >
                    <Trash2 />
                  </Button>
                </div>

                <TranscriptPanel
                  attachment={a}
                  pending={pending}
                  onRetry={() =>
                    run(() => retryTranscription(a.id), "Transcribed")
                  }
                />
              </div>
            ))}
        </section>
      ) : null}

      {/* Add more */}
      <section className="flex flex-wrap items-start gap-3 rounded-xl border border-dashed border-border p-4">
        <ImagePicker files={images} onChange={setImages} disabled={pending} />
        <VoiceRecorder value={audio} onChange={setAudio} disabled={pending} />
        {images.length > 0 || audio ? (
          <span className="w-full text-xs text-muted-foreground">
            Press Save to attach.
          </span>
        ) : null}
      </section>
    </div>
  );
}

function TranscriptPanel({
  attachment,
  pending,
  onRetry,
}: {
  attachment: EditorAttachment;
  pending: boolean;
  onRetry: () => void;
}) {
  if (attachment.transcriptStatus === "DONE") {
    return (
      <div className="rounded-md bg-card p-2.5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Transcript
        </p>
        <p className="prose-entry text-sm">{attachment.transcript}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        {attachment.transcriptStatus === "PENDING"
          ? "Not transcribed yet — the audio is saved."
          : "Transcription failed."}
      </span>
      {attachment.transcriptError ? (
        <span className="opacity-70">{attachment.transcriptError}</span>
      ) : null}
      <Button size="sm" variant="outline" onClick={onRetry} disabled={pending}>
        <RefreshCw />
        Transcribe now
      </Button>
    </div>
  );
}
