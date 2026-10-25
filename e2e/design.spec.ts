import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "vite";
import { resolveConfig } from "electron-vite";
import { launchApp } from "./helpers";

test("development gallery renders the ported components and dialog interactions", async () => {
  const testInfo = test.info();
  test.setTimeout(90_000);
  const { config } = await resolveConfig({}, "serve");
  const server = await createServer({
    ...config!.renderer,
    configFile: false,
    root: resolve("src/renderer"),
    // Exercise a cold CI startup instead of depending on a developer's populated Vite cache.
    cacheDir: testInfo.outputPath("node_modules", ".vite"),
    server: { host: "127.0.0.1", port: 0 },
    clearScreen: false,
  });
  let instance: Awaited<ReturnType<typeof launchApp>> | undefined;
  try {
    await server.listen();
    await Promise.all([
      server.environments.client.warmupRequest("/src/main.tsx"),
      server.environments.client.warmupRequest("/src/features/design/design-gallery.tsx"),
    ]);
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("No se pudo abrir la galería.");
    // Set the initial route before loading: a later first navigation could overwrite an early hash change.
    instance = await launchApp({ rendererUrl: `http://127.0.0.1:${address.port}/#/_design` });
    const page = await instance.app.firstWindow();
    await expect(page.getByRole("heading", { name: "Diseño de Iris" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("[data-font-key]")).toHaveCount(9);
    await page.getByRole("button", { name: "Abrir diálogo", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Editar canción" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Editar canción" })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("iris-design-gallery.png") });
  } finally {
    try {
      await instance?.close();
    } finally {
      await server.close();
    }
  }
});
