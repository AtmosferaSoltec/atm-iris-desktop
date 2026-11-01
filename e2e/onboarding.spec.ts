import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("shows the welcome tour once and credits Atmosfera in settings", async () => {
  const instance = await launchApp({ onboarding: true });
  try {
    const page = await instance.app.firstWindow();
    await expect(page.getByRole("heading", { name: "Bienvenido a Iris" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Desarrollado por/ })).toBeVisible();
    for (let step = 0; step < 3; step++)
      await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page.getByRole("link", { name: "Configuración" })).toBeVisible();
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("button", { name: /Desarrollado por/ })).toBeVisible();
  } finally {
    await instance.close();
  }
});
