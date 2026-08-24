/**
 * Whether photo and voice-note uploads are available in this environment.
 *
 * `src/lib/storage.ts` writes to a local directory, which only exists somewhere
 * with a real, writable, *persistent* disk. On a serverless host the filesystem
 * is read-only, so every upload would throw `EROFS` — and it would throw late,
 * after the entry row was already created, leaving the writer staring at an
 * error for something that actually saved.
 *
 * So this fails closed: uploads are off unless an environment explicitly turns
 * them on. A new deployment that nobody thought about gets the coherent
 * behaviour (no upload controls at all) rather than the broken one.
 *
 * When the storage adapter moves to object storage, this becomes `true`
 * everywhere and can be deleted.
 */
export const UPLOADS_ENABLED = process.env.UPLOADS_ENABLED === "true";

/** Shown wherever an upload is refused, so the reason is never a stack trace. */
export const UPLOADS_DISABLED_MESSAGE =
  "Photo and voice uploads aren't available yet. Your text is still saved.";
