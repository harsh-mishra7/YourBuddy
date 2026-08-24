import { ListTree } from "lucide-react";
import { Composer } from "@/components/composer";
import { EntryCard } from "@/components/entry-card";
import { ShelfControls } from "@/components/shelf-controls";
import { EmptyState } from "@/components/ui/card";
import { getUndatedEntries, parseSort } from "@/lib/queries";

export default async function UndatedShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q = "", sort } = await searchParams;
  const dir = parseSort(sort);
  const entries = await getUndatedEntries(q.trim(), dir);

  return (
    <div className="flex flex-col gap-5">
      {/* Capture here defaults to a thought with no date — you already said
          which shelf you meant by being on this page. */}
      <Composer defaultKind="THOUGHT" defaultDated={false} />

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Undated</h1>
          <span className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Thoughts, ideas, notes for future you. Not about any particular day.
        </p>
      </div>

      <ShelfControls
        placeholder="Search undated entries…"
        sortLabel={{ desc: "Newest first", asc: "Oldest first" }}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<ListTree className="size-7" />}
          title={q ? "Nothing matches that" : "The undated shelf is empty"}
          hint={
            q
              ? "Search covers titles, body text, and voice transcripts."
              : "Write above, or take the date off any dated entry to move it here."
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
