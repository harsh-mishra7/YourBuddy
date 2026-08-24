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

export const entryInput = z
  .object({
    kind: z.enum(["JOURNAL", "THOUGHT"]),
    title: z.string().trim().max(200).optional(),
    body: z.string().max(50_000).default(""),
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
