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
    await expect(picker.getByRole("button", { name: /Importar/ })).toHaveCount(0);
    await picker.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("button", { name: "Importar Biblia", exact: true }).click();
    await expect(page.getByText("Spanish RVR 1960", { exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.location.hash = "/";
    });
    await page.getByRole("button", { name: "Biblia", exact: true }).click();
    picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    await expect(picker.getByRole("tab", { name: "Tradicional", exact: true })).toBeVisible();
    await expect(picker.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveCount(0);
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
    await input.fill("salm");
    await expect(input).toHaveValue("Salmos");
    await expect(picker.getByRole("button", { name: "Salmos 96", exact: true })).toBeVisible();
    await input.fill("");
    await input.pressSequentially("salmos 96");
    await expect(picker.getByText("Capítulo 96", { exact: true })).toBeVisible();
    await expect(picker.getByRole("button", { name: "13", exact: true })).toBeVisible();
    await input.press("Enter");
    await expect(live.getByText("Salmos 96:1 · RVR1960", { exact: true })).toBeVisible();
    await page.keyboard.press("v");
    picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    await input.fill("Juan 3:999");
    await input.press("Enter");
    await expect(picker.getByText("Ese versículo no existe.", { exact: true })).toBeVisible();
    await input.fill("texto inválido");
    await input.press("Enter");
    await expect(picker).toBeVisible();
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
    await page.getByRole("link", { name: "Configuración" }).click();
    await writeFile(xml, '<bible translation="NVI"/>');
    await page.getByRole("button", { name: "Importar Biblia", exact: true }).click();
    await expect(
      page.getByText("Ese archivo no es una Biblia completa en el formato XML compatible.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Spanish RVR 1960", { exact: true })).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("keeps three translations, switches chapters without mixing text and remembers the selected Bible", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const home = await mkdtemp(join(tmpdir(), "iris-bibles-"));
  let instance: Awaited<ReturnType<typeof launchApp>> | undefined;
  try {
    instance = await launchApp({ home });
    let page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    const xml = join(home, "bible-test.xml");
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    for (const name of ["Spanish RVR 1960", "Reina-Valera 1909", "Nueva Versión Internacional"]) {
      await writeFile(
        xml,
        bibleSampleXml()
          .replace("Spanish RVR 1960", name)
          .replace("Texto de prueba JHN 3:16", `Versículo ${name}`),
      );
      await page.getByRole("button", { name: "Importar Biblia", exact: true }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    await page.evaluate(() => {
      window.location.hash = "/";
    });
    await page.getByRole("button", { name: "Biblia", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Biblia", exact: true });
    await expect(picker.getByRole("button", { name: /Importar/ })).toHaveCount(0);
    await picker.getByRole("tab", { name: "A–Z", exact: true }).click();
    await expect(picker.getByText("Antiguo Testamento", { exact: true })).toHaveCount(0);
    await picker.getByRole("tab", { name: "Tradicional", exact: true }).click();
    await expect(picker.getByText("Antiguo Testamento", { exact: true })).toBeVisible();
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    for (const [name, code] of [
      ["Spanish RVR 1960", "RVR1960"],
      ["Reina-Valera 1909", "RVR1909"],
      ["Nueva Versión Internacional", "NVI"],
    ]) {
      await picker.getByRole("combobox", { name: "Traducción de la Biblia" }).click();
      await page.getByRole("option", { name, exact: true }).click();
      await expect(picker.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveText(
        name,
      );
      const input = picker.getByRole("searchbox", { name: "Versículo", exact: true });
      await input.fill("Juan 3:16");
      await input.press("Enter");
      await expect(live.getByText(`Versículo ${name}`, { exact: true })).toBeVisible();
      await expect(live.getByText(`Juan 3:16 · ${code}`, { exact: true })).toBeVisible();
      if (code !== "NVI") await page.getByRole("button", { name: "Biblia", exact: true }).click();
    }
    await instance.close();
    instance = undefined;
    instance = await launchApp({ home });
    page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Biblia", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveText(
      "Nueva Versión Internacional",
    );
  } finally {
    if (instance) await instance.close();
    await rm(home, { recursive: true, force: true });
  }
});
