import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bibleSampleXml } from "../src/shared/domain/test-fixtures/bible-sample";
import { launchApp } from "./helpers";

test("imports RVR1960, projects a reference, navigates verses, rejects bad input and persists the Bible", async () => {
  const instance = await launchApp();
  try {
    const xml = join(instance.home, "bible-test.xml");
    await writeFile(xml, bibleSampleXml());
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Biblia", exact: true }).click();
    let picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    await picker.getByRole("button", { name: "Importar RVR1960", exact: true }).click();
    await expect(picker.getByRole("searchbox", { name: "Versículo", exact: true })).toBeVisible();
    await picker.getByRole("searchbox", { name: "Versículo", exact: true }).fill("Juan 3:16-18");
    await picker.getByRole("searchbox", { name: "Versículo", exact: true }).press("Enter");
    await expect(picker).toHaveCount(0);
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    await expect(live.getByText("Texto de prueba JHN 3:16", { exact: true })).toBeVisible();
    await expect(live.getByText("Juan 3:16 · RVR1960", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Servicio", exact: true })
        .getByText("Servicio vacío", { exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      const result = await window.iris["projection:start"]({ isPreview: true });
      if (!result.ok) throw new Error(result.error.message);
    });
    await expect.poll(() => instance.app.windows().length).toBe(2);
    const output = instance.app.windows().find((window) => window !== page)!;
    await expect(output.getByText("Texto de prueba JHN 3:16", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await expect(output.getByText("Juan 3:17 · RVR1960", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(live.getByText("Juan 3:16 · RVR1960", { exact: true })).toBeVisible();
    await page.keyboard.press("v");
    picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    const input = picker.getByRole("searchbox", { name: "Versículo", exact: true });
    await input.fill("Juan 3:999");
    await input.press("Enter");
    await expect(picker.getByText("Ese versículo no existe.", { exact: true })).toBeVisible();
    await input.fill("texto inválido");
    await input.press("Enter");
    await expect(picker).toBeVisible();
    await writeFile(xml, '<bible translation="NVI"/>');
    await picker.getByRole("button", { name: "Importar RVR1960", exact: true }).click();
    await expect(
      picker.getByText(
        "Ese archivo no es una Biblia RVR1960 completa en el formato XML compatible.",
        { exact: true },
      ),
    ).toBeVisible();
    await picker.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Biblia", exact: true }).click();
    picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    await picker.getByRole("button", { name: "Juan", exact: true }).click();
    await picker.getByRole("button", { name: "Juan 3", exact: true }).click();
    await picker.getByRole("button", { name: "36", exact: true }).click();
    await expect(live.getByText("Juan 3:36 · RVR1960", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente", exact: true })).toBeDisabled();
    await page.evaluate(async () => {
      await window.iris["projection:stop"](undefined);
    });
  } finally {
    await instance.close();
  }
});
