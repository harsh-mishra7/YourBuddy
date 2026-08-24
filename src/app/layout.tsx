import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { ReminderBanner } from "@/components/reminder-banner";
import { getDueReminders, getShelfCounts } from "@/lib/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: "YourBuddy",
  description:
    "A personal space to capture whatever's in your head — without forcing everything to live under a date.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#22201e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved on every load — that *is* the reminder mechanism (§7).
  const [reminders, counts] = await Promise.all([
    getDueReminders(),
    getShelfCounts(),
  ]);

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <SiteNav counts={counts} />
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
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
