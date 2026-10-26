import { silentMp3 } from "./audio-fixture";
import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("creates, searches without accents, edits, archives, restores and deletes a song", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Nueva canción", exact: true }).click();
    let editor = page.getByRole("dialog", { name: "Nueva canción", exact: true });
    await editor.getByLabel("Título", { exact: true }).fill("Canción de oración");
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      editor.getByText(
        "Pega la letra o elige una pista: separa cada diapositiva con una línea en blanco.",
        { exact: true },
      ),
    ).toBeVisible();
    await editor.getByLabel("Autor", { exact: true }).fill("José");
    await expect(editor.getByRole("button", { name: /Buscar (?:letra|canción)/i })).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.has(window.iris, "songs:lookup-lyrics"))).toBe(false);
    await editor
      .getByLabel("Letra", { exact: true })
      .fill("#Estrofa 1\nSublime gracia del Señor\n\n#Coro\nQué preciosa gracia");
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(editor).toHaveCount(0);
    const library = page.getByRole("region", { name: "Biblioteca", exact: true });
    await library
      .getByRole("searchbox", { name: "Buscar en la biblioteca", exact: true })
      .fill("oracion");
    await expect(library.getByText("Canción de oración", { exact: true })).toBeVisible();
    await library.getByText("Canción de oración", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Editar canción", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Canción de oración", exact: true });
    await editor.getByLabel("Título", { exact: true }).fill("Oración renovada");
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(library.getByText("Oración renovada", { exact: true })).toBeVisible();
    await library.getByText("Oración renovada", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Archivar", exact: true }).click();
    await expect(library.getByText("Oración renovada", { exact: true })).toHaveCount(0);
    await library.getByRole("button", { name: "Archivadas", exact: true }).click();
    await library.getByRole("button", { name: "Restaurar", exact: true }).click();
    await library.getByRole("button", { name: "Volver a la biblioteca", exact: true }).click();
    await library.getByText("Oración renovada", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Editar canción", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Oración renovada", exact: true });
    await editor.getByRole("button", { name: "Eliminar canción", exact: true }).click();
    await page
      .getByRole("dialog", { name: "¿Eliminar «Oración renovada»?", exact: true })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await expect(library.getByText("Oración renovada", { exact: true })).toHaveCount(0);
  } finally {
    await instance.close();
  }
});

test("imports a local track and renames it safely and trashes it when the song is deleted", async () => {
  const instance = await launchApp();
  try {
    const source = join(instance.home, "fixture.mp3");
    await writeFile(source, silentMp3());
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Nueva canción", exact: true }).click();
    let editor = page.getByRole("dialog", { name: "Nueva canción", exact: true });
    await editor.getByLabel("Título", { exact: true }).fill("Solo pista local");
    await editor.locator('input[type="file"]').setInputFiles(source);
    await expect(editor.getByText("fixture.mp3", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByText("Solo pista local", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Editar canción", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Solo pista local", exact: true });
    await editor.getByLabel("Nombre del archivo de audio", { exact: true }).fill("Renamed audio");
    await editor.getByRole("button", { name: "Renombrar", exact: true }).click();
    await expect(editor.getByText("Renamed audio.mp3", { exact: true })).toBeVisible();
    expect((await stat(join(instance.home, "Audio", "Renamed audio.mp3"))).isFile()).toBe(true);
    await expect(stat(join(instance.home, "Audio", "fixture.mp3"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await editor.getByRole("button", { name: "Eliminar canción", exact: true }).click();
    const confirmation = page.getByRole("dialog", {
      name: "¿Eliminar «Solo pista local»?",
      exact: true,
    });
    await expect(confirmation.getByRole("checkbox")).toHaveCount(0);
    await confirmation.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByText("Solo pista local", { exact: true })).toHaveCount(0);
    await expect(stat(join(instance.home, "Audio", "Renamed audio.mp3"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await instance.close();
  }
});

test("discards an imported audio when it is removed or its draft is cancelled", async () => {
  const instance = await launchApp();
  try {
    const source = join(instance.home, "draft.mp3");
    await writeFile(source, silentMp3());
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Nueva canción", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Nueva canción", exact: true });
    await editor.locator('input[type="file"]').setInputFiles(source);
    await expect(editor.getByText("draft.mp3", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Quitar la pista", exact: true }).click();
    await expect
      .poll(async () =>
        stat(join(instance.home, "Audio", "draft.mp3")).then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
    await editor.locator('input[type="file"]').setInputFiles(source);
    await expect(editor.getByText("draft.mp3", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect
      .poll(async () =>
        stat(join(instance.home, "Audio", "draft.mp3")).then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
    expect((await stat(source)).isFile()).toBe(true);
  } finally {
    await instance.close();
  }
});
