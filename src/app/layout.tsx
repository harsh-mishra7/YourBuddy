import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * The root layout is deliberately empty of anything user-specific.
 *
 * It wraps both the signed-in app and the login screen, so the moment it
 * fetches reminders or shelf counts, /login needs a user to render — and
 * redirects to itself. The authenticated shell lives in `(app)/layout.tsx`.
 */

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
