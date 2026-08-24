"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { parseLocalDateTime, type ActionResult } from "@/lib/validation";

/**
 * Reminders are opt-in and in-app only (§7). Nothing here schedules a job or
 * sends anything — a reminder simply becomes visible the next time you open
 * the app after its time has passed.
 */
export async function setReminder(
  entryId: string,
  remindAtLocal: string,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const entry = await prisma.entry.findFirst({ where: { id: entryId, userId } });
  if (!entry) return { ok: false, error: "Entry not found" };

  const remindAt = parseLocalDateTime(remindAtLocal);
  if (!remindAt) return { ok: false, error: "Pick a valid date and time." };

  await prisma.reminder.upsert({
    where: { entryId },
    update: { remindAt, dismissedAt: null },
    create: { userId, entryId, remindAt },
  });

  revalidatePath("/", "layout");
  revalidatePath(`/entry/${entryId}`);
  return { ok: true };
}

export async function clearReminder(entryId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const reminder = await prisma.reminder.findFirst({
    where: { entryId, userId },
  });
  if (!reminder) return { ok: true };

  await prisma.reminder.delete({ where: { entryId } });

  revalidatePath("/", "layout");
  revalidatePath(`/entry/${entryId}`);
  return { ok: true };
}

export async function dismissReminder(
  reminderId: string,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });
  if (!reminder) return { ok: false, error: "Reminder not found" };

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { dismissedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function snoozeReminder(
  reminderId: string,
  days: number,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });
  if (!reminder) return { ok: false, error: "Reminder not found" };

  const next = new Date();
  next.setDate(next.getDate() + days);

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { remindAt: next, dismissedAt: null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
