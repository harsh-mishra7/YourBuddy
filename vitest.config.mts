import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json so tests import the same way
    // application code does.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Node, not jsdom: everything under test here is server-side or pure.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
