"use client";

import { useMemo, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTrackerLog, toggleBinaryLog } from "@/app/actions/trackers";
import { Button } from "@/components/ui/button";
import { cn, formatDateOnly, fromDateKey } from "@/lib/entry-display";

export interface HistoryLog {
  id: string;
  dateKey: string;
  boolValue: boolean | null;
  numValue: number | null;
  textValue: string | null;
  note: string | null;
  images: { id: string; url: string }[];
}

/** N most recent days, oldest first, as date keys. */
function recentDayKeys(count: number): string[] {
  const today = new Date();
  const base = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base - (count - 1 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Log type drives the history view — more than cadence does (§4).
 * Binary → a grid of days. Number → a line chart. Text → a list.
 */
export function TrackerHistory({
  trackerId,
  logType,
  unit,
  logs,
}: {
  trackerId: string;
  logType: "BINARY" | "NUMBER" | "TEXT";
  unit: string | null;
  logs: HistoryLog[];
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No check-ins yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {logType === "BINARY" ? (
        <BinaryGrid trackerId={trackerId} logs={logs} />
      ) : null}
      {logType === "NUMBER" ? <NumberChart unit={unit} logs={logs} /> : null}
      <LogList logType={logType} unit={unit} logs={logs} />
    </div>
  );
}

function BinaryGrid({
  trackerId,
  logs,
}: {
  trackerId: string;
  logs: HistoryLog[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const done = useMemo(
    () => new Set(logs.filter((l) => l.boolValue).map((l) => l.dateKey)),
    [logs],
  );
  // 18 weeks of days, laid out in columns of 7 like a contribution graph.
  const days = useMemo(() => recentDayKeys(126), []);

  function toggle(dateKey: string) {
    startTransition(async () => {
      const result = await toggleBinaryLog(trackerId, dateKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Last 18 weeks</h3>
        <span className="text-xs text-muted-foreground">
          Tap a day to toggle
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((dateKey) => {
                const isDone = done.has(dateKey);
                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(dateKey)}
                    title={`${formatDateOnly(fromDateKey(dateKey))}${
                      isDone ? " — done" : ""
                    }`}
                    aria-label={`${formatDateOnly(fromDateKey(dateKey))}${
                      isDone ? ", done" : ", not logged"
                    }`}
                    className={cn(
                      "size-3.5 shrink-0 rounded-[3px] transition-colors disabled:opacity-60",
                      isDone
                        ? "bg-primary hover:opacity-80"
                        : "bg-muted hover:bg-input",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumberChart({
  unit,
  logs,
}: {
  unit: string | null;
  logs: HistoryLog[];
}) {
  // Logs arrive newest-first; a chart reads left-to-right through time.
  const data = useMemo(
    () =>
      [...logs]
        .filter((l) => l.numValue !== null)
        .reverse()
        .map((l) => ({
          date: l.dateKey,
          label: formatDateOnly(fromDateKey(l.dateKey)),
          value: l.numValue as number,
        })),
    [logs],
  );

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">
        Over time{unit ? ` (${unit})` : ""}
      </h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              label={
                unit
                  ? {
                      value: unit,
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                        textAnchor: "middle",
                      },
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              formatter={(v: number | string) => [
                `${v}${unit ? ` ${unit}` : ""}`,
                "Value",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--primary)" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LogList({
  logType,
  unit,
  logs,
}: {
  logType: "BINARY" | "NUMBER" | "TEXT";
  unit: string | null;
  logs: HistoryLog[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTrackerLog(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Check-in deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Check-ins</h3>

      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs text-muted-foreground">
                {formatDateOnly(fromDateKey(log.dateKey))}
              </span>

              {logType === "NUMBER" && log.numValue !== null ? (
                <span className="text-sm font-medium tabular-nums">
                  {log.numValue}
                  {unit ? ` ${unit}` : ""}
                </span>
              ) : null}

              {logType === "BINARY" ? (
                <span className="text-sm font-medium text-primary">Done</span>
              ) : null}
            </div>

            {logType === "TEXT" && log.textValue ? (
              <p className="mt-1 whitespace-pre-wrap text-sm">{log.textValue}</p>
            ) : null}

            {log.note ? (
              <p className="mt-1 text-sm italic text-muted-foreground">
                {log.note}
              </p>
            ) : null}

            {log.images.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {log.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative size-16 overflow-hidden rounded-md border border-border"
                  >
                    <Image
                      src={img.url}
                      alt="Check-in photo"
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="iconSm"
            disabled={pending}
            onClick={() => remove(log.id)}
            aria-label="Delete check-in"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
