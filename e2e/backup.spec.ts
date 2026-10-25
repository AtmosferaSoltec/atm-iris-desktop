import { expect, test } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchApp } from "./helpers";

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
        youtubeId: null,
      });
      if (!result.ok) throw new Error(result.error.message);
    });
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("button", { name: "Descargar respaldo", exact: true }).click();
    await expect
      .poll(async () => {
        try {
          return JSON.parse(await readFile(path, "utf8")).songs.length;
        } catch {
          return 0;
        }
      })
      .toBe(1);
    await page.getByRole("button", { name: "Importar respaldo", exact: true }).click();
    await expect(
      page.getByText(/Se importaron 0 canciones y 0 videos de YouTube; 1 ya estaban/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Crear respaldo ahora", exact: true }).click();
    await expect(page.getByText("Respaldo creado", { exact: true })).toBeVisible();
    expect(
      (await readdir(join(instance.home, "Backups"))).filter((name) => name.startsWith("iris-")),
    ).toHaveLength(2);
    await page.getByRole("checkbox", { name: "Eliminar canciones", exact: true }).check();
    await page.getByRole("button", { name: "Eliminar lo elegido", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar todo", exact: true })).toBeDisabled();
    await page.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
    await page.getByRole("button", { name: "Eliminar todo", exact: true }).click();
    await expect(page.getByText(/Se eliminó todo lo elegido \(1 canciones/)).toBeVisible();
    await page.getByRole("button", { name: "Importar respaldo", exact: true }).click();
    await expect(page.getByText(/Se importaron 1 canción y 0 videos de YouTube/)).toBeVisible();
    await writeFile(path, "not a backup");
    await page.getByRole("button", { name: "Importar respaldo", exact: true }).click();
    await expect(
      page.getByText("Ese archivo no es un respaldo de Iris.", { exact: true }),
    ).toBeVisible();
  } finally {
    await instance.close();
  }
});
