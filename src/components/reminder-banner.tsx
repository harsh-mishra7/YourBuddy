"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { dismissReminder, snoozeReminder } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { excerpt, formatTimestamp } from "@/lib/utils";

export interface DueReminder {
  id: string;
  remindAt: string;
  entryId: string;
  title: string | null;
  body: string;
}

/**
 * A reminder set months ago can't pull you back into the app — it simply waits
 * here for the next time you open it (§7). That's the whole mechanism.
 */
export function ReminderBanner({ reminders }: { reminders: DueReminder[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (reminders.length === 0) return null;

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
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
    <section className="mb-5 flex flex-col gap-2">
      {reminders.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-primary/25 bg-accent/60 p-3.5"
        >
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-accent-foreground">
            <Bell className="size-3.5" />
            You asked to see this again
            <span className="font-normal opacity-70">
              · {formatTimestamp(new Date(r.remindAt))}
            </span>
          </div>

          <Link
            href={`/entry/${r.entryId}`}
            className="block text-sm text-foreground hover:underline"
          >
            {r.title ? (
              <span className="font-medium">{r.title}</span>
            ) : (
              excerpt(r.body, 140)
            )}
          </Link>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => act(() => dismissReminder(r.id), "Reminder cleared")}
            >
              <Check />
              Got it
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                act(() => snoozeReminder(r.id, 7), "Back in a week")
              }
            >
              <Clock />
              Next week
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
