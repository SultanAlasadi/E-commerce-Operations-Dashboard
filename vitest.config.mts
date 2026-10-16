import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // Next's env loader skips .env.local when NODE_ENV=test; load it explicitly so
    // database tests can reach the development branch. They skip themselves otherwise.
    env: loadEnv("development", process.cwd(), ""),
    // Database tests share one Neon branch; run files one at a time.
    fileParallelism: false,
  },
});
