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

test("saves a YouTube-only song with main-process oEmbed validation", async () => {
  const instance = await launchApp();
  try {
    await instance.app.evaluate(() => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ title: "Pista de prueba", author_name: "Autor" }), {
          status: 200,
        });
    });
    const page = await instance.app.firstWindow();
    await page.route(/^https?:/, (route) => route.abort());
    await page.getByRole("button", { name: "Nueva canción", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Nueva canción", exact: true });
    await editor.getByLabel("Título", { exact: true }).fill("Solo YouTube");
    await editor
      .getByRole("textbox", { name: "Enlace de YouTube", exact: true })
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await editor.getByLabel("Título", { exact: true }).click();
    await expect(editor.getByText("Pista de prueba", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Solo YouTube", { exact: true })).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("imports a local track and keeps it when its song is deleted by default", async () => {
  const instance = await launchApp();
  try {
    const bytes = Buffer.alloc(44 + 16000);
    bytes.write("RIFF", 0);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write("WAVEfmt ", 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(8000, 24);
    bytes.writeUInt32LE(16000, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36);
    bytes.writeUInt32LE(16000, 40);
    const source = join(instance.home, "fixture.wav");
    await writeFile(source, bytes);
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Nueva canción", exact: true }).click();
    let editor = page.getByRole("dialog", { name: "Nueva canción", exact: true });
    await editor.getByLabel("Título", { exact: true }).fill("Solo pista local");
    await editor.locator('input[type="file"]').setInputFiles(source);
    await expect(editor.getByText("fixture.wav", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByText("Solo pista local", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Editar canción", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Solo pista local", exact: true });
    await editor.getByRole("button", { name: "Eliminar canción", exact: true }).click();
    const confirmation = page.getByRole("dialog", {
      name: "¿Eliminar «Solo pista local»?",
      exact: true,
    });
    await expect(confirmation.getByRole("checkbox")).not.toBeChecked();
    await confirmation.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByText("Solo pista local", { exact: true })).toHaveCount(0);
    expect((await stat(join(instance.home, "Audio", "fixture.wav"))).isFile()).toBe(true);
  } finally {
    await instance.close();
  }
});
