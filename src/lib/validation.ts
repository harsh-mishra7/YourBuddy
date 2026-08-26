import { z } from "zod";

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// --- Accounts ---------------------------------------------------------------

// Length beats composition rules: forcing a symbol into an eight-character
// password buys less than four more characters does, and pushes people toward
// the same handful of predictable substitutions.
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Emails are stored lower-cased and trimmed, always.
 *
 * Skip this and `Harsh@x.com` and `harsh@x.com` become two accounts holding
 * two halves of one person's journal — with no way to merge them back.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "That password is too long.");

export const signUpInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "What should we call you?")
    .max(80, "That name is too long."),
  email: z
    .email({ error: "Enter a valid email address." })
    .max(254, "That email is too long."),
  password: passwordField,
});

export const signInInput = z.object({
  email: z.email({ error: "Enter a valid email address." }).max(254),
  password: z.string().min(1, "Enter your password."),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordField,
});

/** Shape returned to `useActionState` by every auth form action. */
export type AuthState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      ok?: boolean;
      message?: string;
    }
  | undefined;

/**
 * Only ever redirect to a path on this site.
 *
 * `?next=` comes from the URL, so without this check a crafted link could send
 * someone through a real login straight onto an attacker's page — with the
 * trust of having just typed their password.
 */
export function safeNextPath(value: string | undefined | null): string {
  if (!value) return "/";
  // "//host" and "/\host" are protocol-relative — they leave the site.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  if (value.startsWith("/login") || value.startsWith("/signup")) return "/";
  return value;
}

export const entryInput = z
  .object({
    title: z.string().trim().max(200).optional(),
    body: z.string().max(50_000, "That entry is too long.").default(""),
    // The formatted copy of the same words, so it carries markup on top of
    // them — room for marks on every sentence, still bounded.
    bodyRich: z.string().max(200_000, "That entry is too long.").default(""),
    // "" means the entry has no date — it lives on the undated shelf.
    entryDate: z
      .string()
      .refine((v) => v === "" || DATE_KEY.test(v), "Invalid date")
      .default(""),
    // Local datetime string from <input type="datetime-local">, or "".
    remindAt: z.string().default(""),
  })
  .refine((v) => v.body.trim().length > 0 || (v.title ?? "").trim().length > 0, {
    message: "Write something first.",
    path: ["body"],
  });

export const trackerInput = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    cadence: z.enum(["DAILY", "OCCASIONAL"]),
    logType: z.enum(["BINARY", "NUMBER", "TEXT"]),
    unit: z.string().trim().max(20).optional(),
  })
  .refine((v) => v.logType !== "NUMBER" || (v.unit ?? "").length > 0, {
    // "80" alone is meaningless — kilos, minutes, or pages? (§4)
    message: "Number trackers need a unit.",
    path: ["unit"],
  });

export const trackerLogInput = z.object({
  trackerId: z.string().min(1),
  logDate: z.string().regex(DATE_KEY, "Invalid date"),
  boolValue: z.boolean().optional(),
  numValue: z.number().finite().optional(),
  textValue: z.string().trim().max(5_000).optional(),
  note: z.string().trim().max(5_000).optional(),
});

export type EntryInput = z.infer<typeof entryInput>;
export type TrackerInput = z.infer<typeof trackerInput>;

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** Turn a `datetime-local` value into a Date, or null when blank. */
export function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
