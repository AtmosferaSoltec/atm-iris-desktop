import { expect, test } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { silentMp3 } from "./audio-fixture";
import { launchApp, openSettings } from "./helpers";

test("shows the first unused files and opens the whole list with search", async () => {
  const instance = await launchApp();
  try {
    for (let index = 1; index <= 8; index++)
      await writeFile(join(instance.home, "Audio", `pista ${index}.mp3`), silentMp3());
    const page = await instance.app.firstWindow();
    await page.evaluate(() => window.iris["media:scan"](undefined));
    const settings = await openSettings(instance.app, page);
    await expect(settings.getByRole("button", { name: "Mostrar todos (8)" })).toBeVisible();
    await expect(settings.getByRole("button", { name: "Quitar" })).toHaveCount(5);
    await settings.getByRole("button", { name: "Mostrar todos (8)" }).click();
    const dialog = settings.getByRole("dialog", { name: "Archivos sin uso" });
    await expect(dialog.getByText("pista 8", { exact: true })).toBeVisible();
    await dialog.getByLabel("Buscar archivo").fill("pista 3");
    await expect(dialog.getByText("pista 3", { exact: true })).toBeVisible();
    await expect(dialog.getByText("pista 4", { exact: true })).toHaveCount(0);
  } finally {
    await instance.close();
  }
});

test("copies the chosen file types to a folder, each in its own subfolder", async () => {
  const instance = await launchApp();
  try {
    await writeFile(join(instance.home, "Audio", "uno.mp3"), silentMp3());
    await writeFile(join(instance.home, "Backgrounds", "fondo.png"), Buffer.from("png"));
    const destination = join(instance.home, "..", `iris-copy-${Date.now()}`);
    await mkdir(destination, { recursive: true });
    await instance.app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] });
    }, destination);
    const page = await instance.app.firstWindow();
    const settings = await openSettings(instance.app, page);
    await settings.getByRole("button", { name: "Copiar archivos a una carpeta" }).click();
    const dialog = settings.getByRole("dialog", { name: "Copiar archivos" });
    await dialog.getByRole("checkbox", { name: "Videos" }).uncheck();
    await dialog.getByRole("button", { name: "Elegir carpeta y copiar" }).click();
    await expect(settings.getByText("Se copiaron 2 archivos")).toBeVisible();
    expect((await readdir(destination)).sort()).toEqual(["Fondos", "Pistas"]);
    expect(await readdir(join(destination, "Pistas"))).toEqual(["uno.mp3"]);
  } finally {
    await instance.close();
  }
});
