import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.APP_USER_EMAIL ?? "you@example.com";
  const name = process.env.APP_USER_NAME ?? "You";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  console.log(`Seeded user ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
