import { CalendarDays } from "lucide-react";
import { Composer } from "@/components/composer";
import { EntryCard } from "@/components/entry-card";
import { ShelfControls } from "@/components/shelf-controls";
import { EmptyState } from "@/components/ui/card";
import { getDatedEntries, parseSort } from "@/lib/queries";
import { monthLabel } from "@/lib/utils";

export default async function DatedShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q = "", sort } = await searchParams;
  const dir = parseSort(sort);
  const entries = await getDatedEntries(q.trim(), dir);

  // Grouped by the month an entry is *about*, not the month it was written in.
  const groups: { label: string; entries: typeof entries }[] = [];
  for (const entry of entries) {
    const label = monthLabel(entry.entryDate!);
    const last = groups.at(-1);
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  return (
    <div className="flex flex-col gap-5">
      <Composer defaultKind="JOURNAL" defaultDated />

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Dated</h1>
          <span className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything where <em>when</em> is part of the meaning.
        </p>
      </div>

      <ShelfControls
        placeholder="Search dated entries…"
        sortLabel={{ desc: "Newest first", asc: "Oldest first" }}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-7" />}
          title={q ? "Nothing matches that" : "Nothing on the timeline yet"}
          hint={
            q
              ? "Try a different word — search looks at titles, body text, and voice transcripts."
              : "Write something above. It files under today unless you pick another date."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-2.5">
              <h2 className="sticky top-14 z-10 -mx-1 w-fit rounded-md bg-background/90 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm sm:top-16">
                {group.label}
              </h2>
              {group.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
