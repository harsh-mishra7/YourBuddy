import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export type SortDir = "desc" | "asc";

export function parseSort(value: string | undefined): SortDir {
  // Newest first by default — the thing you just wrote should not land at the
  // bottom of a list that grows forever (§7).
  return value === "asc" ? "asc" : "desc";
}

/**
 * Keyword match over title, body, and voice-note transcripts.
 *
 * Transcripts are included deliberately: a spoken entry is a real entry, and
 * leaving it out of search would make voice notes second-class.
 */
function searchFilter(q: string) {
  if (!q) return {};
  const mode = "insensitive" as const;
  return {
    OR: [
      { title: { contains: q, mode } },
      { body: { contains: q, mode } },
      { attachments: { some: { transcript: { contains: q, mode } } } },
    ],
  };
}

const entryInclude = {
  attachments: {
    orderBy: { createdAt: "asc" as const },
  },
  reminder: true,
} as const;

export type EntryWithRelations = Awaited<
  ReturnType<typeof getDatedEntries>
>[number];

/** The dated shelf — a timeline, ordered by what day the entry is *about*. */
export async function getDatedEntries(q = "", dir: SortDir = "desc") {
  const userId = await getCurrentUserId();
  return prisma.entry.findMany({
    where: { userId, entryDate: { not: null }, ...searchFilter(q) },
    include: entryInclude,
    orderBy: [{ entryDate: dir }, { createdAt: "desc" }],
  });
}

/** The undated shelf — ordered by when you wrote it, newest first. */
export async function getUndatedEntries(q = "", dir: SortDir = "desc") {
  const userId = await getCurrentUserId();
  return prisma.entry.findMany({
    where: { userId, entryDate: null, ...searchFilter(q) },
    include: entryInclude,
    orderBy: { createdAt: dir },
  });
}

export async function getEntry(id: string) {
  const userId = await getCurrentUserId();
  return prisma.entry.findFirst({
    where: { id, userId },
    include: entryInclude,
  });
}

export async function getShelfCounts() {
  const userId = await getCurrentUserId();
  const [dated, undated] = await Promise.all([
    prisma.entry.count({ where: { userId, entryDate: { not: null } } }),
    prisma.entry.count({ where: { userId, entryDate: null } }),
  ]);
  return { dated, undated };
}

/**
 * Reminders resolve on load: anything whose time has passed and which hasn't
 * been dismissed is waiting the next time you open the app.
 */
export async function getDueReminders() {
  const userId = await getCurrentUserId();
  return prisma.reminder.findMany({
    where: { userId, dismissedAt: null, remindAt: { lte: new Date() } },
    include: { entry: true },
    orderBy: { remindAt: "asc" },
  });
}

export async function getTrackers(includeArchived = false) {
  const userId = await getCurrentUserId();
  return prisma.tracker.findMany({
    where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
    include: {
      logs: { orderBy: { logDate: "desc" }, take: 120 },
      _count: { select: { logs: true } },
    },
    orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function getTracker(id: string) {
  const userId = await getCurrentUserId();
  return prisma.tracker.findFirst({
    where: { id, userId },
    include: {
      logs: {
        orderBy: { logDate: "desc" },
        include: { attachments: true },
      },
      _count: { select: { logs: true } },
    },
  });
}

export type TrackerWithLogs = NonNullable<Awaited<ReturnType<typeof getTracker>>>;
export type TrackerSummary = Awaited<ReturnType<typeof getTrackers>>[number];
