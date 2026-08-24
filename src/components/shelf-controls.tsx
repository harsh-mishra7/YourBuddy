"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Keyword search plus a sort toggle.
 *
 * Each shelf toggles its own axis: the dated shelf sorts by the day an entry
 * is *about*, the undated shelf by when it was written. Mixing those up makes
 * a backdated entry appear at today's position (§7).
 */
export function ShelfControls({
  sortLabel,
  placeholder,
}: {
  sortLabel: { desc: string; asc: string };
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentQ = params.get("q") ?? "";
  const dir = params.get("sort") === "asc" ? "asc" : "desc";

  const [q, setQ] = useState(currentQ);
  const [syncedQ, setSyncedQ] = useState(currentQ);

  // Keep the box in step when navigation changes the URL underneath it —
  // adjusting during render rather than in an effect, so there's no extra
  // pass where the input shows a stale value.
  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setQ(currentQ);
  }

  function push(next: { q?: string; sort?: string }) {
    const sp = new URLSearchParams(params.toString());

    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if (next.sort !== undefined) {
      if (next.sort === "asc") sp.set("sort", "asc");
      else sp.delete("sort");
    }

    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (q === currentQ) return;
    const t = setTimeout(() => push({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9 pr-9"
          aria-label="Search entries"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        onClick={() => push({ sort: dir === "desc" ? "asc" : "desc" })}
        title={dir === "desc" ? sortLabel.desc : sortLabel.asc}
      >
        {dir === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpWideNarrow />}
        <span className="hidden sm:inline">
          {dir === "desc" ? sortLabel.desc : sortLabel.asc}
        </span>
      </Button>
    </div>
  );
}
