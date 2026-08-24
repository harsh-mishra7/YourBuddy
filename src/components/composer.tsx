"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CalendarOff, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createEntry } from "@/app/actions/entries";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { ImagePicker } from "@/components/image-picker";
import { VoiceRecorder, type RecordedAudio } from "@/components/voice-recorder";
import { cn, todayKey } from "@/lib/utils";

/**
 * Capture, fast: open → write → save. No mandatory title, no mandatory type,
 * and a date that's already filled in so there's nothing to decide (§5).
 */
export function Composer({
  defaultDated = true,
  uploadsEnabled = false,
}: {
  defaultDated?: boolean;
  /** Resolved on the server — see `src/lib/uploads.ts` for why it's off by default. */
  uploadsEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dated, setDated] = useState(defaultDated);
  const [entryDate, setEntryDate] = useState(todayKey());
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [remindAt, setRemindAt] = useState("");
  const [showReminder, setShowReminder] = useState(false);

  function reset() {
    setTitle("");
    setBody("");
    setImages([]);
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio(null);
    setRemindAt("");
    setShowReminder(false);
    setDated(defaultDated);
    setEntryDate(todayKey());
    setExpanded(false);
  }

  function submit() {
    if (!body.trim() && !title.trim() && !audio && images.length === 0) {
      toast.error("Write something first.");
      return;
    }

    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("entryDate", dated ? entryDate : "");
    fd.set("remindAt", remindAt);
    images.forEach((f) => fd.append("images", f));
    if (audio) {
      fd.set("audio", audio.file);
      fd.set("audioDuration", String(audio.seconds));
    }

    startTransition(async () => {
      const result = await createEntry(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dated ? "Saved to the dated shelf" : "Saved to the undated shelf");
      reset();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "rounded-xl border border-border bg-card transition-shadow",
        expanded && "shadow-[0_2px_14px_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="p-3 sm:p-4">
        {expanded ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            disabled={pending}
            className="mb-2 border-0 bg-transparent px-0 text-base font-medium focus:border-0"
          />
        ) : null}

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="What's on your mind?"
          rows={expanded ? 4 : 1}
          disabled={pending}
          className="min-h-10 border-0 bg-transparent px-0 py-1.5 focus:border-0"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      {expanded ? (
        <>
          <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:px-4">
            {/* The date is the only thing that decides which shelf this lands
                on: a date means dated, no date means undated. */}
            <div className="flex flex-wrap items-center gap-2">
              {dated ? (
                <div className="flex items-center gap-1.5">
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
                    onClick={() => setDated(false)}
                    disabled={pending}
                    title="This isn't about a day — move it to the undated shelf"
                  >
                    <CalendarOff />
                    <span className="hidden sm:inline">No date</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDated(true)}
                  disabled={pending}
                >
                  <CalendarPlus />
                  Undated — add a date
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReminder((s) => !s);
                  if (showReminder) setRemindAt("");
                }}
                disabled={pending}
                className={cn(showReminder && "text-foreground")}
              >
                {showReminder ? <BellOff /> : <Bell />}
                <span className="hidden sm:inline">
                  {showReminder ? "No reminder" : "Remind me"}
                </span>
              </Button>
            </div>

            {showReminder ? (
              <div className="flex flex-col gap-1">
                <Input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                  disabled={pending}
                  className="h-9 w-fit text-xs"
                />
                <span className="text-xs text-muted-foreground">
                  Shown in-app the next time you open it after this time.
                </span>
              </div>
            ) : null}

            {uploadsEnabled ? (
              <div className="flex flex-wrap items-start gap-3">
                <ImagePicker
                  files={images}
                  onChange={setImages}
                  disabled={pending}
                />
                <VoiceRecorder
                  value={audio}
                  onChange={setAudio}
                  disabled={pending}
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5 sm:px-4">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {dated ? "Filed under a day" : "Lives on the undated shelf"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </form>
  );
}
