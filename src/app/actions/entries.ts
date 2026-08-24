"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { storage } from "@/lib/storage";
import { checkStorageQuota, incomingUploadBytes } from "@/lib/quota";
import { UPLOADS_ENABLED, UPLOADS_DISABLED_MESSAGE } from "@/lib/uploads";
import { transcribe } from "@/lib/transcription";
import { fromDateKey } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  entryInput,
  parseLocalDateTime,
  type ActionResult,
} from "@/lib/validation";

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Shared by create and update: persist images + voice note onto an entry. */
async function saveAttachments(
  userId: string,
  entryId: string,
  formData: FormData,
): Promise<{ transcript: string | null }> {
  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  for (const image of images) {
    if (!ACCEPTED_IMAGE_TYPES.includes(image.type)) continue;
    if (image.size > MAX_IMAGE_BYTES) continue;

    // Keyed under the owner. Ownership is enforced by the attachment lookup,
    // not by the path — but a per-user prefix means a stray key can't be
    // walked into someone else's folder, and deleting an account is a subtree.
    const stored = await storage.put(image, `u/${userId}/images`);
    await prisma.attachment.create({
      data: {
        userId,
        entryId,
        kind: "IMAGE",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        fileName: image.name || null,
        transcriptStatus: "NOT_APPLICABLE",
      },
    });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return { transcript: null };
  if (!audio.type.startsWith("audio/") || audio.size > MAX_AUDIO_BYTES) {
    return { transcript: null };
  }

  const durationRaw = Number(formData.get("audioDuration"));
  const stored = await storage.put(audio, `u/${userId}/audio`);

  // Transcribe on save. A missing provider parks it as PENDING rather than
  // failing the save — the audio is safe either way (§5).
  const outcome = await transcribe(audio, audio.name || "voice-note.webm");

  await prisma.attachment.create({
    data: {
      userId,
      entryId,
      kind: "AUDIO",
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      fileName: audio.name || "voice-note",
      durationSeconds: Number.isFinite(durationRaw)
        ? Math.round(durationRaw)
        : null,
      transcriptStatus: outcome.status,
      transcript: outcome.status === "DONE" ? outcome.text : null,
      transcriptError:
        outcome.status === "FAILED"
          ? outcome.error
          : outcome.status === "PENDING"
            ? outcome.reason
            : null,
    },
  });

  return { transcript: outcome.status === "DONE" ? outcome.text : null };
}

export async function createEntry(formData: FormData): Promise<ActionResult> {
  const userId = await getCurrentUserId();

  // Both checks run before anything is written, so a refusal never leaves a
  // saved entry with half its photos missing — or, worse, a saved entry the
  // writer was told had failed.
  const incoming = incomingUploadBytes(formData);
  if (incoming > 0 && !UPLOADS_ENABLED) {
    return { ok: false, error: UPLOADS_DISABLED_MESSAGE };
  }

  const overQuota = await checkStorageQuota(userId, incoming);
  if (overQuota) return { ok: false, error: overQuota };

  const parsed = entryInput.safeParse({
    title: (formData.get("title") as string) ?? "",
    body: (formData.get("body") as string) ?? "",
    entryDate: (formData.get("entryDate") as string) ?? "",
    remindAt: (formData.get("remindAt") as string) ?? "",
  });

  const hasAudio =
    formData.get("audio") instanceof File &&
    (formData.get("audio") as File).size > 0;
  const hasImages = formData
    .getAll("images")
    .some((f) => f instanceof File && f.size > 0);

  if (!parsed.success) {
    // A voice note or a photo on its own is a legitimate entry, even with no
    // typed text — the transcript becomes the body below.
    if (!hasAudio && !hasImages) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry" };
    }
  }

  const data = parsed.success
    ? parsed.data
    : {
        title: ((formData.get("title") as string) ?? "").trim(),
        body: ((formData.get("body") as string) ?? "").trim(),
        entryDate: ((formData.get("entryDate") as string) ?? "").trim(),
        remindAt: ((formData.get("remindAt") as string) ?? "").trim(),
      };

  try {
    const entry = await prisma.entry.create({
      data: {
        userId,
        title: data.title?.trim() || null,
        body: data.body ?? "",
        entryDate: data.entryDate ? fromDateKey(data.entryDate) : null,
      },
    });

    const { transcript } = await saveAttachments(userId, entry.id, formData);

    // Everything must exist as text (§4). If you only spoke, the transcript
    // becomes the entry body so search and the future AI can reach it.
    if (transcript && !entry.body.trim()) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: { body: transcript },
      });
    }

    const remindAt = parseLocalDateTime(data.remindAt ?? "");
    if (remindAt) {
      await prisma.reminder.create({
        data: { userId, entryId: entry.id, remindAt },
      });
    }

    refreshAll();
    return { ok: true, id: entry.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save entry",
    };
  }
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();

  const existing = await prisma.entry.findFirst({
    where: { id: entryId, userId },
  });
  if (!existing) return { ok: false, error: "Entry not found" };

  const incoming = incomingUploadBytes(formData);
  if (incoming > 0 && !UPLOADS_ENABLED) {
    return { ok: false, error: UPLOADS_DISABLED_MESSAGE };
  }

  const overQuota = await checkStorageQuota(userId, incoming);
  if (overQuota) return { ok: false, error: overQuota };

  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();
  const entryDate = ((formData.get("entryDate") as string) ?? "").trim();

  try {
    await prisma.entry.update({
      where: { id: entryId },
      data: {
        title: title || null,
        body,
        entryDate: entryDate ? fromDateKey(entryDate) : null,
        // Keep the remembered date in step when a date is set explicitly.
        priorEntryDate: entryDate
          ? fromDateKey(entryDate)
          : existing.priorEntryDate,
      },
    });

    await saveAttachments(userId, entryId, formData);

    refreshAll();
    revalidatePath(`/entry/${entryId}`);
    return { ok: true, id: entryId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update entry",
    };
  }
}

/**
 * The single gesture that says "this isn't about a day" (§4) — and its
 * reverse. The removed date is remembered so putting it back is lossless.
 */
export async function toggleEntryDate(entryId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const entry = await prisma.entry.findFirst({ where: { id: entryId, userId } });
  if (!entry) return { ok: false, error: "Entry not found" };

  if (entry.entryDate) {
    await prisma.entry.update({
      where: { id: entryId },
      data: { priorEntryDate: entry.entryDate, entryDate: null },
    });
  } else {
    // Fall back to the day it was written if we never had a date to remember.
    const restored =
      entry.priorEntryDate ??
      fromDateKey(entry.createdAt.toISOString().slice(0, 10));
    await prisma.entry.update({
      where: { id: entryId },
      data: { entryDate: restored },
    });
  }

  refreshAll();
  revalidatePath(`/entry/${entryId}`);
  return { ok: true, id: entryId };
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();

  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId },
    include: { attachments: true },
  });
  if (!entry) return { ok: false, error: "Entry not found" };

  for (const a of entry.attachments) await storage.remove(a.storageKey);
  await prisma.entry.delete({ where: { id: entryId } });

  refreshAll();
  return { ok: true };
}

export async function deleteAttachment(
  attachmentId: string,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, userId },
  });
  if (!attachment) return { ok: false, error: "Attachment not found" };

  await storage.remove(attachment.storageKey);
  await prisma.attachment.delete({ where: { id: attachmentId } });

  refreshAll();
  return { ok: true };
}

/** Retry a transcript that was parked as PENDING or failed. */
export async function retryTranscription(
  attachmentId: string,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, userId, kind: "AUDIO" },
  });
  if (!attachment) return { ok: false, error: "Voice note not found" };

  const bytes = await storage.read(attachment.storageKey);
  const blob = new Blob([new Uint8Array(bytes)], { type: attachment.mimeType });
  const outcome = await transcribe(blob, attachment.fileName ?? "voice-note");

  await prisma.attachment.update({
    where: { id: attachmentId },
    data: {
      transcriptStatus: outcome.status,
      transcript: outcome.status === "DONE" ? outcome.text : null,
      transcriptError:
        outcome.status === "FAILED"
          ? outcome.error
          : outcome.status === "PENDING"
            ? outcome.reason
            : null,
    },
  });

  if (outcome.status === "DONE" && attachment.entryId) {
    const entry = await prisma.entry.findUnique({
      where: { id: attachment.entryId },
    });
    if (entry && !entry.body.trim()) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: { body: outcome.text },
      });
    }
  }

  refreshAll();
  if (attachment.entryId) revalidatePath(`/entry/${attachment.entryId}`);

  return outcome.status === "DONE"
    ? { ok: true }
    : {
        ok: false,
        error:
          outcome.status === "PENDING"
            ? outcome.reason
            : outcome.error,
      };
}
