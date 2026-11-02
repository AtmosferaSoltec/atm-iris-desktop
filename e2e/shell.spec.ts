import { test, expect } from "@playwright/test";
import { launchApp, openSettings } from "./helpers";

test("settings open in their own window, secondary pages return to the service and display has no shell", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    const settings = await openSettings(instance.app, page);
    await expect(settings.getByRole("link", { name: "Volver al servicio" })).toHaveCount(0);
    // The console never left: closing the settings window is the way back.
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Configuración", exact: true }).click();
    expect(instance.app.windows()).toHaveLength(2);
    await settings.close();
    await expect.poll(() => instance.app.windows().length).toBe(1);
    await page.getByRole("link", { name: "Tiempos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tiempos", exact: true })).toBeVisible();
    await page.evaluate(() => {
      location.hash = "/display";
    });
    await expect(page.getByRole("main", { name: "Proyección" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al servicio" })).toHaveCount(0);
    await page.evaluate(() => {
      location.hash = "/_design";
    });
    await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("bundled typefaces load with network requests blocked", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.route(/^https?:/, (route) => route.abort());
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
    const result = await page.evaluate(async () => {
      const families = [
        "Inter",
        "Newsreader",
        "Montserrat",
        "Poppins",
        "Oswald",
        "Bebas Neue",
        "Playfair Display",
        "Lora",
        "Merriweather",
      ];
      return Promise.all(
        families.map(async (family) => {
          const fonts = await document.fonts.load(
            `400 32px "${family}"`,
            "Sublime gracia del Señor",
          );
          return {
            family,
            loaded: fonts.length > 0 && fonts.every((font) => font.status === "loaded"),
          };
        }),
      );
    });
    expect(result).toHaveLength(9);
    expect(result.filter((font) => !font.loaded)).toEqual([]);
  } finally {
    await instance.close();
  }
});
