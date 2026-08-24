import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

/**
 * Set (or reset) an account's password from the terminal.
 *
 *   npm run db:set-password -- someone@example.com 'a long passphrase'
 *
 * There is no reset-by-email — that needs a mail provider, which v1 doesn't
 * have. Until it does, this is the recovery path, and it deliberately requires
 * access to the server rather than access to an inbox.
 */
async function main() {
  const [emailArg, password] = process.argv.slice(2);

  if (!emailArg || !password) {
    console.error(
      "Usage: npm run db:set-password -- <email> <password>",
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const email = emailArg.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No account with email ${email}.`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });

    // A password reset is a response to losing control of the account, so end
    // every session it currently has.
    const { count } = await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    console.log(
      `Password set for ${email}${
        count ? ` — signed out of ${count} session${count === 1 ? "" : "s"}` : ""
      }.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
