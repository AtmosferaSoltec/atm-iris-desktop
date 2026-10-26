import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("blocks the console until the mandatory update is installed", async () => {
  const instance = await launchApp({ updates: "available" });
  try {
    const page = await instance.app.firstWindow();
    await expect(page.getByRole("heading", { name: "Actualización obligatoria" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Actualizar y reiniciar" }).click();
    await expect(page.getByText("Preparando el reinicio de Iris…")).toBeVisible();
    expect(
      await instance.app.evaluate(() => Reflect.get(globalThis, "irisE2eUpdateInstalled")),
    ).toBe(true);
  } finally {
    await instance.close();
  }
});

test("a failed mandatory download keeps the block and offers a retry", async () => {
  const instance = await launchApp({ updates: "download-error" });
  try {
    const page = await instance.app.firstWindow();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByText(/No pudimos preparar la actualización obligatoria/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toHaveCount(0);
  } finally {
    await instance.close();
  }
});

test("without connection and with nothing pending, Iris opens normally", async () => {
  const instance = await launchApp({ updates: "offline" });
  try {
    const page = await instance.app.firstWindow();
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
  } finally {
    await instance.close();
  }
});
