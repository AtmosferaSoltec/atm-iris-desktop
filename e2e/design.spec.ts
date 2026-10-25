import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "vite";
import { resolveConfig } from "electron-vite";
import { launchApp } from "./helpers";

test("development gallery renders the ported components and dialog interactions", async () => {
  const { config } = await resolveConfig({}, "serve");
  const server = await createServer({
    ...config!.renderer,
    configFile: false,
    root: resolve("src/renderer"),
    server: { host: "127.0.0.1", port: 0 },
    clearScreen: false,
  });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("No se pudo abrir la galería.");
  const instance = await launchApp({ rendererUrl: `http://127.0.0.1:${address.port}` });
  try {
    const page = await instance.app.firstWindow();
    await page.evaluate(() => {
      location.hash = "/_design";
    });
    await expect(page.getByRole("heading", { name: "Diseño de Iris" })).toBeVisible();
    await expect(page.locator("[data-font-key]")).toHaveCount(9);
    await page.getByRole("button", { name: "Abrir diálogo", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Editar canción" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Editar canción" })).toHaveCount(0);
    await page.screenshot({ path: "/tmp/iris-design-gallery.png" });
  } finally {
    await instance.close();
    await server.close();
  }
});
