import { expect, test } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchApp, openSettings } from "./helpers";

test("exports and reimports without duplicates, snapshots and erases with typed confirmation", async () => {
  const instance = await launchApp();
  try {
    const path = join(instance.home, "backup.json");
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, path);
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      const result = await window.iris["songs:create"]({
        title: "Respaldo de prueba",
        author: "Autor",
        sections: [{ label: "Coro", text: "Letra de prueba" }],
        audioId: null,
      });
      if (!result.ok) throw new Error(result.error.message);
    });
    const settings = await openSettings(instance.app, page);
    await settings
      .getByRole("button", { name: "Descargar canciones (letras)", exact: true })
      .click();
    await expect
      .poll(async () => {
        try {
          return JSON.parse(await readFile(path, "utf8")).songs.length;
        } catch {
          return 0;
        }
      })
      .toBe(1);
    await settings.getByRole("button", { name: "Importar canciones", exact: true }).click();
    const preview = settings.getByRole("dialog", { name: "Importar canciones" });
    await expect(preview.getByText("Ya existe una canción igual.")).toBeVisible();
    await expect(preview.getByRole("button", { name: "No hay canciones nuevas" })).toBeDisabled();
    await preview.getByRole("button", { name: "Cancelar" }).click();
    await settings.getByRole("button", { name: "Crear respaldo ahora", exact: true }).click();
    await expect(settings.getByText("Respaldo creado", { exact: true })).toBeVisible();
    expect(
      (await readdir(join(instance.home, "Backups"))).filter((name) => name.startsWith("iris-")),
    ).toHaveLength(2);
    await settings.getByRole("checkbox", { name: "Eliminar canciones", exact: true }).check();
    await settings.getByRole("button", { name: "Eliminar lo elegido", exact: true }).click();
    await expect(
      settings.getByRole("button", { name: "Eliminar todo", exact: true }),
    ).toBeDisabled();
    await settings.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
    await settings.getByRole("button", { name: "Eliminar todo", exact: true }).click();
    await expect(settings.getByText(/Se eliminó todo lo elegido \(1 canciones/)).toBeVisible();
    await settings.getByRole("button", { name: "Importar canciones", exact: true }).click();
    await settings
      .getByRole("dialog", { name: "Importar canciones" })
      .getByRole("button", { name: "Importar 1 canción" })
      .click();
    await expect(settings.getByText(/Se importaron 1 canción/)).toBeVisible();
    await writeFile(path, "not a backup");
    await settings.getByRole("button", { name: "Importar canciones", exact: true }).click();
    await expect(
      settings.getByText("Ese archivo no parece un archivo de canciones (JSON).", {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await instance.close();
  }
});
