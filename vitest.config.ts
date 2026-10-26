import { optionalDownloader } from "./scripts/optional-downloader";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [optionalDownloader(false, "renderer")],
  resolve: {
    alias: {
      "@shared": resolve("src/shared"),
      "@renderer": resolve("src/renderer/src"),
      "@main": resolve("src/main"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/main/test-setup.ts"],
  },
});
