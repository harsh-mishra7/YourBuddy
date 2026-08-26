import Link from "next/link";
import Image from "next/image";
import { Bell, Mic, ImageIcon } from "lucide-react";
import { EntryActions } from "@/components/entry-actions";
import type { EntryWithRelations } from "@/lib/queries";
import {
  formatDateOnly,
  formatLocalDate,
  formatTimestamp,
  mediaUrlFor,
} from "@/lib/entry-display";
import { plainToRichText, richExcerpt } from "@/lib/rich-text";

export function EntryCard({ entry }: { entry: EntryWithRelations }) {
  const images = entry.attachments.filter((a) => a.kind === "IMAGE");
  const audio = entry.attachments.filter((a) => a.kind === "AUDIO");
  // What you marked bold is bold here too — a preview that quietly flattened
  // the entry would make formatting feel like it hadn't been saved.
  const preview = richExcerpt(entry.bodyRich ?? plainToRichText(entry.body), 220);

  return (
    <article className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/40">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {entry.entryDate
                ? formatDateOnly(entry.entryDate)
                : formatTimestamp(entry.createdAt)}
            </span>

            {/* A backdated entry shows both dates, so the timeline never
                quietly implies you wrote it on the day it's about. */}
            {entry.entryDate &&
            formatDateOnly(entry.entryDate) !==
              formatDateOnly(entry.createdAt) ? (
              <span className="opacity-70">
                · written {formatDateOnly(entry.createdAt)}
              </span>
            ) : null}

            {entry.reminder && !entry.reminder.dismissedAt ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Bell className="size-3" />
                {formatLocalDate(entry.reminder.remindAt)}
              </span>
            ) : null}
          </div>

          <Link href={`/entry/${entry.id}`} className="block">
            {entry.title ? (
              <h3 className="mb-0.5 truncate font-medium text-foreground">
                {entry.title}
              </h3>
            ) : null}
            {preview ? (
              // Safe by construction: every character here has been through
              // `richExcerpt`, which escapes text and emits only the three
              // marks. See `src/lib/rich-text.ts`.
              <p
                className="line-clamp-3 text-sm leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <p className="text-sm italic text-muted-foreground/70">
                No text — {audio.length ? "voice note" : "photo"} only
              </p>
            )}
          </Link>

          {images.length > 0 ? (
            <div className="mt-2.5 flex gap-1.5">
              {images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative size-14 overflow-hidden rounded-md border border-border"
                >
                  <Image
                    src={mediaUrlFor(img.storageKey)}
                    alt={img.fileName ?? "Attached photo"}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              ))}
              {images.length > 4 ? (
                <div className="flex size-14 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                  +{images.length - 4}
                </div>
              ) : null}
            </div>
          ) : null}

          {(audio.length > 0 || images.length > 0) && images.length === 0 ? (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {audio.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Mic className="size-3" />
                  {audio.length} voice note{audio.length > 1 ? "s" : ""}
                </span>
              ) : null}
              {images.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="size-3" />
                  {images.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <EntryActions entryId={entry.id} isDated={Boolean(entry.entryDate)} />
      </div>
    </article>
  );
}
