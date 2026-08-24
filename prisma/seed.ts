import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

/**
 * Seeds the first account.
 *
 * Signup is open now, so this is no longer how users get created — its real
 * job is the account that existed *before* there were passwords. Set
 * APP_USER_PASSWORD and run this once, and the journal you already wrote
 * becomes reachable through the login screen instead of stranded.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const email = (process.env.APP_USER_EMAIL ?? "you@example.com")
      .trim()
      .toLowerCase();
    const name = process.env.APP_USER_NAME ?? "You";
    const password = process.env.APP_USER_PASSWORD;

    const passwordHash = password ? await hashPassword(password) : undefined;

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, ...(passwordHash ? { passwordHash } : {}) },
      create: { email, name, passwordHash: passwordHash ?? null },
    });

    console.log(`Seeded user ${user.email} (${user.id})`);

    if (!user.passwordHash) {
      console.warn(
        "\n  ⚠  This account has no password and cannot sign in yet.\n" +
          "     Set APP_USER_PASSWORD in .env and re-run `npm run db:seed`,\n" +
          "     or run: npm run db:set-password -- <email> <password>\n",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
