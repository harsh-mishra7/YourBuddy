import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` never opens a connection, so a placeholder keeps
    // builds working in environments without DATABASE_URL set.
    url:
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
