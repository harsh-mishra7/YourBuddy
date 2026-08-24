import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * v1 is single-user, but every row carries a user id so that opening the app
 * up later is a login screen rather than a migration of every table (§3).
 *
 * This is the one place that decides "who am I". Swapping it for a real
 * session lookup is the entire cost of adding auth.
 */
export const getCurrentUser = cache(async () => {
  const email = process.env.APP_USER_EMAIL ?? "you@example.com";
  const name = process.env.APP_USER_NAME ?? "You";

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name },
  });
});

export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  return user.id;
}
