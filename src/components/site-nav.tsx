"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListTree, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Dated", icon: CalendarDays, key: "dated" as const },
  { href: "/undated", label: "Undated", icon: ListTree, key: "undated" as const },
  { href: "/trackers", label: "Trackers", icon: Target, key: null },
];

export function SiteNav({
  counts,
}: {
  counts: { dated: number; undated: number };
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop / tablet: a normal header. */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-background/85 backdrop-blur-md sm:block">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-6 py-3">
          <Link
            href="/"
            className="mr-4 text-base font-semibold tracking-tight text-foreground"
          >
            Your<span className="text-primary">Buddy</span>
          </Link>

          {TABS.map(({ href, label, icon: Icon, key }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {key && counts[key] > 0 ? (
                <span className="text-xs tabular-nums text-muted-foreground/70">
                  {counts[key]}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </header>

      {/* Mobile: the app is a phone-first capture tool, so navigation sits
          under the thumb rather than at the top of the screen. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:hidden">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Your<span className="text-primary">Buddy</span>
        </Link>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        {TABS.map(({ href, label, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              isActive(href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            <span>
              {label}
              {key && counts[key] > 0 ? ` · ${counts[key]}` : ""}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
