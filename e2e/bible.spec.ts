import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bibleSampleXml } from "../src/shared/domain/test-fixtures/bible-sample";
import { launchApp, openBible, openSettings } from "./helpers";

test("imports RVR1960, projects a reference, navigates verses, rejects bad input and persists the Bible", async () => {
  const instance = await launchApp();
  try {
    const xml = join(instance.home, "bible-test.xml");
    await writeFile(xml, bibleSampleXml());
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    const page = await instance.app.firstWindow();
    let picker = await openBible(instance.app, page);
    await expect(picker.getByText("No hay Biblias importadas", { exact: false })).toBeVisible();
    await picker.close();
    let settings = await openSettings(instance.app, page);
    await settings.getByRole("button", { name: "Importar Biblia", exact: true }).click();
    await expect(settings.getByText("Spanish RVR 1960", { exact: true })).toBeVisible();
    await settings.close();
    picker = await openBible(instance.app, page);
    await expect(picker.getByRole("tab", { name: "Tradicional", exact: true })).toBeVisible();
    await expect(picker.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveCount(0);
    const input = picker.getByRole("searchbox", { name: "Versículo", exact: true });
    await expect(input).toBeVisible();
    await input.fill("Juan 3:16-18");
    await input.press("Enter");
    // The window stays open for the next verse; the passage goes to the screens, not the service.
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    await expect(live.getByText("Texto de prueba JHN 3:16", { exact: true })).toBeVisible();
    await expect(live.getByText("Juan 3:16 · RVR1960", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Servicio", exact: true })
        .getByText("Servicio vacío", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente", exact: true })).toHaveCount(0);
    await page.evaluate(async () => {
      const result = await window.iris["projection:start"]({ isPreview: true });
      if (!result.ok) throw new Error(result.error.message);
    });
    await expect
      .poll(() => instance.app.windows().some((window) => window.url().includes("#/display")))
      .toBe(true);
    const output = instance.app.windows().find((window) => window.url().includes("#/display"))!;
    await expect(output.getByText("Texto de prueba JHN 3:16", { exact: true })).toBeVisible();
    await picker.getByRole("heading", { name: "Biblia", exact: true }).click();
    await picker.keyboard.press("ArrowRight");
    await expect(output.getByText("Juan 3:17 · RVR1960", { exact: true })).toBeVisible();
    await picker.keyboard.press("ArrowLeft");
    await expect(live.getByText("Juan 3:16 · RVR1960", { exact: true })).toBeVisible();
    await input.fill("salm");
    await expect(input).toHaveValue("Salmos");
    await expect(picker.getByRole("button", { name: "Salmos 96", exact: true })).toBeVisible();
    await input.fill("");
    await input.pressSequentially("salmos 96");
    await expect(picker.getByText("Capítulo 96", { exact: true })).toBeVisible();
    await expect(picker.getByRole("button", { name: "13", exact: true })).toBeVisible();
    await input.press("Enter");
    await expect(live.getByText("Salmos 96:1 · RVR1960", { exact: true })).toBeVisible();
    await input.fill("Juan 3:999");
    await input.press("Enter");
    await expect(picker.getByText("Ese versículo no existe.", { exact: true })).toBeVisible();
    await input.fill("texto inválido");
    await input.press("Enter");
    await expect(input).toBeVisible();
    await expect(live.getByText("Salmos 96:1 · RVR1960", { exact: true })).toBeVisible();

    // Closing the window ends the presentation: the passage leaves the screens.
    await picker.close();
    await expect(live.getByText("Salmos 96:1 · RVR1960", { exact: true })).toHaveCount(0);

    picker = await openBible(instance.app, page);
    await picker.getByRole("button", { name: "Libros", exact: true }).click();
    await picker.getByRole("button", { name: "Juan", exact: true }).click();
    await picker.getByRole("button", { name: "Juan 3", exact: true }).click();
    await picker.getByRole("button", { name: "36", exact: true }).click();
    await expect(live.getByText("Juan 3:36 · RVR1960", { exact: true })).toBeVisible();
    await picker.close();
    await page.evaluate(async () => {
      await window.iris["projection:stop"](undefined);
    });
    settings = await openSettings(instance.app, page);
    await writeFile(xml, '<bible translation="NVI"/>');
    await settings.getByRole("button", { name: "Importar Biblia", exact: true }).click();
    await expect(
      settings.getByText("Ese archivo no es una Biblia completa en el formato XML compatible.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(settings.getByText("Spanish RVR 1960", { exact: true })).toBeVisible();
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
    const settings = await openSettings(instance.app, page);
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
      await settings.getByRole("button", { name: "Importar Biblia", exact: true }).click();
      await expect(settings.getByText(name, { exact: true })).toBeVisible();
    }
    await settings.close();
    const picker = await openBible(instance.app, page);
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
      await picker.getByRole("option", { name, exact: true }).click();
      await expect(picker.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveText(
        name,
      );
      const input = picker.getByRole("searchbox", { name: "Versículo", exact: true });
      await input.fill("Juan 3:16");
      await input.press("Enter");
      await expect(live.getByText(`Versículo ${name}`, { exact: true })).toBeVisible();
      await expect(live.getByText(`Juan 3:16 · ${code}`, { exact: true })).toBeVisible();
      await picker.getByRole("button", { name: "Libros", exact: true }).click();
    }
    await instance.close();
    instance = undefined;
    instance = await launchApp({ home });
    page = await instance.app.firstWindow();
    const reopened = await openBible(instance.app, page);
    await expect(reopened.getByRole("combobox", { name: "Traducción de la Biblia" })).toHaveText(
      "Nueva Versión Internacional",
    );
  } finally {
    if (instance) await instance.close();
    await rm(home, { recursive: true, force: true });
  }
});

test("reopens on the last book: another chapter is one click, or typed without the book", async () => {
  const instance = await launchApp();
  try {
    const xml = join(instance.home, "bible-test.xml");
    await writeFile(xml, bibleSampleXml());
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      const result = await window.iris["bible:import"](undefined);
      if (!result.ok) throw new Error(result.error.message);
    });
    await page.reload();
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    let picker = await openBible(instance.app, page);
    await picker.getByRole("searchbox", { name: "Versículo", exact: true }).fill("Lucas 16:1");
    await picker.getByRole("searchbox", { name: "Versículo", exact: true }).press("Enter");
    await expect(live.getByText("Lucas 16:1 · RVR1960", { exact: true })).toBeVisible();
    await picker.close();

    // The preacher moves to chapter 20: the window is already on Lucas, with 16 marked.
    picker = await openBible(instance.app, page);
    await expect(picker.getByRole("button", { name: "Lucas 16", exact: true })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await picker.getByRole("button", { name: "Lucas 20", exact: true }).click();
    await picker.getByRole("button", { name: "1", exact: true }).click();
    await expect(live.getByText("Lucas 20:1 · RVR1960", { exact: true })).toBeVisible();
    await picker.close();

    // Or typed without the book.
    picker = await openBible(instance.app, page);
    const input = picker.getByRole("searchbox", { name: "Versículo", exact: true });
    await expect(input).toHaveAttribute("placeholder", "Juan 3:16, o solo 20:8 en Lucas");
    await input.fill("3:1");
    await input.press("Enter");
    await expect(live.getByText("Lucas 3:1 · RVR1960", { exact: true })).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("the Bible keeps its own lettering apart from the songs'", async () => {
  const instance = await launchApp();
  try {
    const xml = join(instance.home, "bible-test.xml");
    await writeFile(xml, bibleSampleXml());
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      const result = await window.iris["bible:import"](undefined);
      if (!result.ok) throw new Error(result.error.message);
    });
    const picker = await openBible(instance.app, page);
    await picker.getByRole("button", { name: "Texto", exact: true }).click();
    const dialog = picker.getByRole("dialog", { name: "Letra de la Biblia", exact: true });
    await dialog.getByRole("button", { name: "Tamaño de la letra: más chica" }).click();
    await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const result = await page.evaluate(async () => {
      const appearance = await window.iris["bible:get-appearance"](undefined);
      const settings = await window.iris["settings:get"](undefined);
      if (!appearance.ok || !settings.ok) throw new Error("No se pudo leer.");
      return {
        bible: appearance.data.typography?.fontSizePt,
        songs: settings.data.projection.fontSizePt,
      };
    });
    expect(result.bible).toBe(result.songs! - 5);
  } finally {
    await instance.close();
  }
});
