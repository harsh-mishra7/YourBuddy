import { prisma } from "@/lib/prisma";

/**
 * Per-account storage limit.
 *
 * Signup is open, which means the upload form is reachable by anyone who finds
 * the URL — and voice notes are capped at 25 MB each. Without a ceiling per
 * account, filling the server's disk is a chore, not an attack.
 *
 * Set `USER_STORAGE_QUOTA_MB=0` to turn this off (sensible when the app is
 * running on your own machine for your own use).
 */
const QUOTA_MB = Number(process.env.USER_STORAGE_QUOTA_MB ?? 500);

export const USER_STORAGE_QUOTA_BYTES =
  Number.isFinite(QUOTA_MB) && QUOTA_MB > 0
    ? QUOTA_MB * 1024 * 1024
    : Number.POSITIVE_INFINITY;

/** Total size of the files riding along on a submission. */
export function incomingUploadBytes(formData: FormData): number {
  let total = 0;
  for (const f of formData.getAll("images")) {
    if (f instanceof File) total += f.size;
  }
  const audio = formData.get("audio");
  if (audio instanceof File) total += audio.size;
  return total;
}

/** Bytes this account currently occupies, summed from its attachments. */
export async function storageUsed(userId: string): Promise<number> {
  const { _sum } = await prisma.attachment.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  });
  return _sum.sizeBytes ?? 0;
}

function formatMb(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * Checked *before* anything is written, so going over the line leaves no
 * half-saved entry with some of its photos missing.
 *
 * Returns an error message to show the user, or null when there's room.
 */
export async function checkStorageQuota(
  userId: string,
  incomingBytes: number,
): Promise<string | null> {
  if (!Number.isFinite(USER_STORAGE_QUOTA_BYTES)) return null;
  if (incomingBytes <= 0) return null;

  const used = await storageUsed(userId);
  if (used + incomingBytes <= USER_STORAGE_QUOTA_BYTES) return null;

  const free = Math.max(0, USER_STORAGE_QUOTA_BYTES - used);
  return `That would go over your ${formatMb(
    USER_STORAGE_QUOTA_BYTES,
  )} of storage — ${formatMb(free)} left. Delete some photos or voice notes first.`;
}
