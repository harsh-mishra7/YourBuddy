"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { storage } from "@/lib/storage";
import { checkStorageQuota, incomingUploadBytes } from "@/lib/quota";
import { UPLOADS_ENABLED, UPLOADS_DISABLED_MESSAGE } from "@/lib/uploads";
import { fromDateKey } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  trackerInput,
  type ActionResult,
} from "@/lib/validation";

export async function createTracker(formData: FormData): Promise<ActionResult> {
  const userId = await getCurrentUserId();

  const parsed = trackerInput.safeParse({
    name: (formData.get("name") as string) ?? "",
    cadence: (formData.get("cadence") as string) ?? "DAILY",
    logType: (formData.get("logType") as string) ?? "BINARY",
    unit: ((formData.get("unit") as string) ?? "").trim(),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tracker" };
  }

  const tracker = await prisma.tracker.create({
    data: {
      userId,
      name: parsed.data.name,
      cadence: parsed.data.cadence,
      logType: parsed.data.logType,
      unit: parsed.data.logType === "NUMBER" ? parsed.data.unit || null : null,
    },
  });

  revalidatePath("/trackers");
  return { ok: true, id: tracker.id };
}

/**
 * Renaming and cadence are always editable. Log type is not, once logs exist —
 * switching binary to number partway would leave a history holding two
 * incompatible value shapes (§7, open question).
 */
export async function updateTracker(
  trackerId: string,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
    include: { _count: { select: { logs: true } } },
  });
  if (!tracker) return { ok: false, error: "Tracker not found" };

  const name = ((formData.get("name") as string) ?? "").trim();
  const cadence = ((formData.get("cadence") as string) ??
    tracker.cadence) as "DAILY" | "OCCASIONAL";
  const requestedLogType = ((formData.get("logType") as string) ??
    tracker.logType) as "BINARY" | "NUMBER" | "TEXT";
  const unit = ((formData.get("unit") as string) ?? "").trim();

  if (!name) return { ok: false, error: "Name is required" };

  const logTypeLocked = tracker._count.logs > 0;
  if (logTypeLocked && requestedLogType !== tracker.logType) {
    return {
      ok: false,
      error: "Log type is locked once a tracker has check-ins.",
    };
  }

  const logType = logTypeLocked ? tracker.logType : requestedLogType;
  if (logType === "NUMBER" && !unit) {
    return { ok: false, error: "Number trackers need a unit." };
  }

  await prisma.tracker.update({
    where: { id: trackerId },
    data: {
      name,
      cadence,
      logType,
      unit: logType === "NUMBER" ? unit : null,
    },
  });

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${trackerId}`);
  return { ok: true, id: trackerId };
}

export async function setTrackerArchived(
  trackerId: string,
  archived: boolean,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
  });
  if (!tracker) return { ok: false, error: "Tracker not found" };

  await prisma.tracker.update({
    where: { id: trackerId },
    data: { archivedAt: archived ? new Date() : null },
  });

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${trackerId}`);
  return { ok: true };
}

export async function deleteTracker(trackerId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
    include: { logs: { include: { attachments: true } } },
  });
  if (!tracker) return { ok: false, error: "Tracker not found" };

  for (const log of tracker.logs) {
    for (const a of log.attachments) await storage.remove(a.storageKey);
  }
  await prisma.tracker.delete({ where: { id: trackerId } });

  revalidatePath("/trackers");
  return { ok: true };
}

/**
 * Record a check-in.
 *
 * Daily trackers hold at most one log per day, so a repeat check-in on the
 * same date edits that day rather than stacking a second row. Occasional
 * trackers have no daily expectation, so multiple logs on one day are normal
 * (three sets of squats is three logs).
 */
export async function logCheckIn(formData: FormData): Promise<ActionResult> {
  const userId = await getCurrentUserId();

  const trackerId = (formData.get("trackerId") as string) ?? "";
  const logDateKey = (formData.get("logDate") as string) ?? "";
  const note = ((formData.get("note") as string) ?? "").trim();

  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
  });
  if (!tracker) return { ok: false, error: "Tracker not found" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDateKey)) {
    return { ok: false, error: "Invalid date" };
  }

  // Before the log row is written — this action has no try/catch around the
  // image loop, so a storage failure here used to surface as a raw 500.
  const incoming = incomingUploadBytes(formData);
  if (incoming > 0 && !UPLOADS_ENABLED) {
    return { ok: false, error: UPLOADS_DISABLED_MESSAGE };
  }

  const overQuota = await checkStorageQuota(userId, incoming);
  if (overQuota) return { ok: false, error: overQuota };

  const logDate = fromDateKey(logDateKey);

  let boolValue: boolean | null = null;
  let numValue: number | null = null;
  let textValue: string | null = null;

  if (tracker.logType === "BINARY") {
    boolValue = formData.get("boolValue") === "false" ? false : true;
  } else if (tracker.logType === "NUMBER") {
    const raw = ((formData.get("numValue") as string) ?? "").trim();
    const parsedNum = Number(raw);
    if (!raw || !Number.isFinite(parsedNum)) {
      return { ok: false, error: `Enter a number${tracker.unit ? ` in ${tracker.unit}` : ""}.` };
    }
    numValue = parsedNum;
  } else {
    textValue = ((formData.get("textValue") as string) ?? "").trim();
    if (!textValue) return { ok: false, error: "Write something to log." };
  }

  const values = { boolValue, numValue, textValue, note: note || null };

  let logId: string;
  if (tracker.cadence === "DAILY") {
    const existing = await prisma.trackerLog.findFirst({
      where: { trackerId, logDate },
    });
    const saved = existing
      ? await prisma.trackerLog.update({
          where: { id: existing.id },
          data: values,
        })
      : await prisma.trackerLog.create({
          data: { userId, trackerId, logDate, ...values },
        });
    logId = saved.id;
  } else {
    const saved = await prisma.trackerLog.create({
      data: { userId, trackerId, logDate, ...values },
    });
    logId = saved.id;
  }

  // Optional media on a check-in.
  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  for (const image of images) {
    if (!ACCEPTED_IMAGE_TYPES.includes(image.type)) continue;
    if (image.size > MAX_IMAGE_BYTES) continue;

    const stored = await storage.put(image, `u/${userId}/images`);
    await prisma.attachment.create({
      data: {
        userId,
        trackerLogId: logId,
        kind: "IMAGE",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        fileName: image.name || null,
        transcriptStatus: "NOT_APPLICABLE",
      },
    });
  }

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${trackerId}`);
  return { ok: true, id: logId };
}

/** One-tap done/undone for a daily binary tracker. */
export async function toggleBinaryLog(
  trackerId: string,
  logDateKey: string,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId, logType: "BINARY" },
  });
  if (!tracker) return { ok: false, error: "Tracker not found" };

  const logDate = fromDateKey(logDateKey);
  const existing = await prisma.trackerLog.findFirst({
    where: { trackerId, logDate },
  });

  if (existing) {
    // Tapping a logged day clears it — no streak guilt, just a correction.
    await prisma.trackerLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.trackerLog.create({
      data: { userId, trackerId, logDate, boolValue: true },
    });
  }

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${trackerId}`);
  return { ok: true };
}

export async function deleteTrackerLog(logId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const log = await prisma.trackerLog.findFirst({
    where: { id: logId, userId },
    include: { attachments: true },
  });
  if (!log) return { ok: false, error: "Check-in not found" };

  for (const a of log.attachments) await storage.remove(a.storageKey);
  await prisma.trackerLog.delete({ where: { id: logId } });

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${log.trackerId}`);
  return { ok: true };
}
