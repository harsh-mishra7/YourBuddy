import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EntryActions } from "@/components/entry-actions";
import { EntryEditor, type EditorEntry } from "@/components/entry-editor";
import { getEntry } from "@/lib/queries";
import { formatTimestamp, mediaUrlFor, toDateKey } from "@/lib/entry-display";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();

  const isDated = Boolean(entry.entryDate);

  const data: EditorEntry = {
    id: entry.id,
    kind: entry.kind,
    title: entry.title ?? "",
    body: entry.body,
    entryDateKey: entry.entryDate ? toDateKey(entry.entryDate) : "",
    createdAtISO: entry.createdAt.toISOString(),
    attachments: entry.attachments.map((a) => ({
      id: a.id,
      kind: a.kind,
      url: mediaUrlFor(a.storageKey),
      fileName: a.fileName,
      sizeBytes: a.sizeBytes,
      durationSeconds: a.durationSeconds,
      transcript: a.transcript,
      transcriptStatus: a.transcriptStatus,
      transcriptError: a.transcriptError,
    })),
    reminder: entry.reminder
      ? {
          id: entry.reminder.id,
          remindAtISO: entry.reminder.remindAt.toISOString(),
        }
      : null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={isDated ? "/" : "/undated"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {isDated ? "Dated" : "Undated"}
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Written {formatTimestamp(entry.createdAt)}
          </span>
          <EntryActions
            entryId={entry.id}
            isDated={isDated}
            onDeleted={isDated ? "/" : "/undated"}
          />
        </div>
      </div>

      <EntryEditor entry={data} />
    </div>
  );
}
