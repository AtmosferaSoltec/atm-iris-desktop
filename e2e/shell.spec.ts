import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("secondary pages return to the service and display has no shell", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
    await page.getByRole("link", { name: "Volver al servicio" }).click();
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
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
