import { SiteNav } from "@/components/site-nav";
import { ReminderBanner } from "@/components/reminder-banner";
import { getDueReminders, getShelfCounts } from "@/lib/queries";
import { requireUser } from "@/lib/user";

/**
 * The signed-in shell.
 *
 * `requireUser` here is what puts a login screen in front of the app, but it
 * is not what keeps one account out of another's data — layouts don't re-run
 * on every navigation. That job belongs to the queries themselves, each of
 * which resolves the current user before it touches a row.
 */

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Resolved on every load — that *is* the reminder mechanism (§7).
  const [reminders, counts] = await Promise.all([
    getDueReminders(),
    getShelfCounts(),
  ]);

  return (
    <>
      <SiteNav
        counts={counts}
        user={{ name: user.name, email: user.email }}
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:pb-16">
        <ReminderBanner
          reminders={reminders.map((r) => ({
            id: r.id,
            remindAt: r.remindAt.toISOString(),
            entryId: r.entryId,
            title: r.entry.title,
            body: r.entry.body,
          }))}
        />
        {children}
      </main>
    </>
  );
}
