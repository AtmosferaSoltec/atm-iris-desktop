import { createVideoFixture } from "./video-fixture";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=",
  "base64",
);
test("imports a fixture, serves its preview, and scans added and missing files", async () => {
  const instance = await launchApp();
  try {
    const source = join(instance.home, "fixture.png");
    await writeFile(source, PNG);
    await instance.app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [filePath],
      })) as typeof dialog.showOpenDialog;
    }, source);
    const page = await instance.app.firstWindow();
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await page.getByRole("button", { name: "Subir imágenes", exact: true }).click();
    await expect(page.getByTitle(/^fixture:/)).toBeVisible();
    await page.getByTitle(/^fixture:/).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Ver y editar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "fixture", exact: true });
    await expect(dialog.getByRole("img", { name: "fixture", exact: true })).toBeVisible();
    expect(
      await dialog
        .getByRole("img", { name: "fixture", exact: true })
        .evaluate((image: HTMLImageElement) => ({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
    ).toEqual({ width: 1, height: 1 });
    await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
    await writeFile(join(instance.home, "Images", "added.png"), PNG);
    await page.getByRole("button", { name: "Buscar archivos", exact: true }).click();
    await expect(page.getByTitle(/^added:/)).toBeVisible();
    await unlink(join(instance.home, "Images", "added.png"));
    await page.getByRole("button", { name: "Buscar archivos", exact: true }).click();
    await page.getByTitle(/^added:/).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Ver y editar", exact: true }).click();
    await expect(page.getByText("No encontramos el archivo.", { exact: true })).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("a video served by iris-media can seek", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    const source = await createVideoFixture(page, instance.home);
    await instance.app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [filePath],
      })) as typeof dialog.showOpenDialog;
    }, source);
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await page.getByRole("button", { name: "Subir imágenes", exact: true }).click();
    await expect(page.getByTitle(/^fixture:/)).toBeVisible();
    await page.getByTitle(/^fixture:/).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Ver y editar", exact: true }).click();
    const video = page.getByRole("dialog", { name: "fixture", exact: true }).locator("video");
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(1);
    const position = await video.evaluate(
      (element: HTMLVideoElement) =>
        new Promise<number>((resolve, reject) => {
          element.onseeked = () => resolve(element.currentTime);
          element.onerror = () => reject(new Error("No se pudo leer el video."));
          element.currentTime = 0.5;
        }),
    );
    expect(position).toBeCloseTo(0.5, 1);
  } finally {
    await instance.close();
  }
});
