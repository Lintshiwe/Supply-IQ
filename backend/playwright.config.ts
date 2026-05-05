import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
  },
});
