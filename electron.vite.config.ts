import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const alias = {
  "@shared": resolve("src/shared"),
  "@main": resolve("src/main"),
  "@renderer": resolve("src/renderer/src"),
};

export default defineConfig({
  main: { resolve: { alias } },
  preload: { resolve: { alias }, build: { externalizeDeps: false } },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          "youtube-player": resolve("src/renderer/youtube-player.html"),
        },
      },
    },
    resolve: { alias },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      {
        name: "iris-development-csp",
        apply: "serve",
        transformIndexHtml(html) {
          // Vite injects the React Refresh preamble only during development.
          return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
        },
      },
    ],
  },
});
