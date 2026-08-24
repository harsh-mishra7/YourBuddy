import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? (
        <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {action}
    </div>
  );
}
