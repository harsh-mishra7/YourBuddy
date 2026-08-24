import { formatDistanceToNow } from "date-fns";
import { LogOut } from "lucide-react";
import { signOut, signOutEverywhere } from "@/app/actions/auth";
import {
  DeleteAccountForm,
  PasswordForm,
  ProfileForm,
  RevokeButton,
} from "@/components/settings-forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAccountTotals,
  getStorageSummary,
  getUserSessions,
} from "@/lib/queries";
import { currentSessionToken, hashToken } from "@/lib/session";
import { requireUser } from "@/lib/user";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * A user-agent string is unreadable; the point of the sessions list is to let
 * someone recognise their own devices, so show the parts that do that.
 */
function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";

  const browser =
    /\bEdg\//.test(ua) ? "Edge"
    : /\bOPR\/|\bOpera/.test(ua) ? "Opera"
    : /\bFirefox\//.test(ua) ? "Firefox"
    : /\bChrome\//.test(ua) ? "Chrome"
    : /\bSafari\//.test(ua) ? "Safari"
    : "Browser";

  const platform =
    /\bAndroid\b/.test(ua) ? "Android"
    : /\b(iPhone|iPad|iPod)\b/.test(ua) ? "iOS"
    : /\bMac OS X\b/.test(ua) ? "macOS"
    : /\bWindows\b/.test(ua) ? "Windows"
    : /\bLinux\b/.test(ua) ? "Linux"
    : null;

  return platform ? `${browser} on ${platform}` : browser;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint ? (
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();

  const [sessions, storage, totals, token] = await Promise.all([
    getUserSessions(),
    getStorageSummary(),
    getAccountTotals(),
    currentSessionToken(),
  ]);

  const currentHash = token ? hashToken(token) : null;
  const others = sessions.filter((s) => s.tokenHash !== currentHash).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Your account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email}.
        </p>
      </div>

      <Section title="Profile">
        <ProfileForm name={user.name ?? ""} />
      </Section>

      <Section
        title="What's in here"
        hint={`${totals.entries} ${
          totals.entries === 1 ? "entry" : "entries"
        }, ${totals.trackers} ${
          totals.trackers === 1 ? "tracker" : "trackers"
        }, ${totals.attachments} ${
          totals.attachments === 1 ? "attachment" : "attachments"
        }.`}
      >
        <p className="text-sm text-muted-foreground">
          {storage.unlimited
            ? `${formatBytes(storage.used)} of photos and voice notes stored. No limit set.`
            : `${formatBytes(storage.used)} of ${formatBytes(
                storage.quota,
              )} used by photos and voice notes.`}
        </p>
        {storage.unlimited ? null : (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (storage.used / storage.quota) * 100)}%`,
              }}
            />
          </div>
        )}
      </Section>

      <Section
        title="Password"
        hint="Used to sign in. There is no reset-by-email yet, so pick something you'll keep."
      >
        <PasswordForm minPasswordLength={MIN_PASSWORD_LENGTH} />
      </Section>

      <Section
        title="Where you're signed in"
        hint="Every browser you've signed in from stays signed in for 30 days of inactivity."
      >
        <ul className="flex flex-col divide-y divide-border">
          {sessions.map((session) => {
            const isCurrent = session.tokenHash === currentHash;
            return (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {describeDevice(session.userAgent)}
                    {isCurrent ? (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        this device
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active {formatDistanceToNow(session.lastActiveAt)} ago ·
                    signed in {formatDistanceToNow(session.createdAt)} ago
                  </p>
                </div>
                {isCurrent ? null : <RevokeButton sessionId={session.id} />}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <form action={signOut}>
            <Button type="submit" size="sm" variant="secondary">
              <LogOut />
              Sign out
            </Button>
          </form>
          {others > 0 ? (
            <form action={signOutEverywhere}>
              <Button type="submit" size="sm" variant="outline">
                Sign out everywhere ({others + 1})
              </Button>
            </form>
          ) : null}
        </div>
      </Section>

      <Section
        title="Delete account"
        hint="Removes your entries, trackers, photos, and voice notes. This cannot be undone."
      >
        <DeleteAccountForm email={user.email} />
      </Section>
    </div>
  );
}
