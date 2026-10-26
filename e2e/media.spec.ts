import { createVideoFixture } from "./video-fixture";
import { writeFile, unlink, readFile, readdir, utimes, stat } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=",
  "base64",
);

type DirectoryIdentity = { device: string; inode: string; isDirectory: boolean };

async function directoryIdentity(path: string): Promise<DirectoryIdentity> {
  const info = await stat(path, { bigint: true });
  return {
    device: info.dev.toString(),
    inode: info.ino.toString(),
    isDirectory: info.isDirectory(),
  };
}

async function openedFolderIdentity(
  instance: Awaited<ReturnType<typeof launchApp>>,
): Promise<DirectoryIdentity | null> {
  const path: unknown = await instance.app.evaluate(() =>
    Reflect.get(globalThis, "lastOpenedFolder"),
  );
  return typeof path === "string" ? directoryIdentity(path) : null;
}

test("reads images from their folder, opens the matching folder, and refreshes added and missing files", async () => {
  const instance = await launchApp();
  try {
    const source = join(instance.home, "Images", "fixture.png");
    await writeFile(source, PNG);
    await instance.app.evaluate(({ shell }) => {
      shell.openPath = async (path) => {
        Reflect.set(globalThis, "lastOpenedFolder", path);
        return "";
      };
    });
    const page = await instance.app.firstWindow();
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    const library = page.getByRole("region", { name: "Biblioteca", exact: true });
    await expect(library.getByRole("button", { name: /Subir|Importar/ })).toHaveCount(0);
    const controls = library.getByRole("group", { name: "Controles de biblioteca", exact: true });
    await expect(controls.locator("input, button").nth(0)).toHaveAccessibleName(
      "Buscar en la biblioteca",
    );
    await expect(controls.getByRole("button").nth(0)).toHaveAccessibleName(
      "Abrir carpeta de imágenes",
    );
    await expect(controls.getByRole("button").nth(1)).toHaveAccessibleName("Actualizar biblioteca");
    await library.getByRole("button", { name: "Abrir carpeta de imágenes", exact: true }).click();
    // Windows can report the same folder through its long name or its DOS 8.3 alias.
    await expect
      .poll(() => openedFolderIdentity(instance))
      .toEqual(await directoryIdentity(join(instance.home, "Images")));
    await page.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(page.getByTitle(/^fixture:/)).toBeVisible();
    const imageRow = library.getByTitle(/^fixture:/);
    await expect(imageRow.getByText("fixture", { exact: true })).toBeVisible();
    const previewBounds = await imageRow.getByRole("img").boundingBox();
    const titleBounds = await imageRow.getByText("fixture", { exact: true }).boundingBox();
    expect(previewBounds!.x + previewBounds!.width).toBeLessThanOrEqual(titleBounds!.x);
    expect(Math.abs(previewBounds!.y - titleBounds!.y)).toBeLessThan(previewBounds!.height);
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
    expect(await readFile(source)).toEqual(PNG);
    expect(await readdir(join(instance.home, "Images"))).toEqual(["fixture.png"]);
    const thumbnail = library.getByRole("img", { name: "fixture", exact: true });
    const previousUrl = await thumbnail.getAttribute("src");
    const updatedPng = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 3;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "blue";
      context.fillRect(0, 0, 2, 3);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const changedBytes = Buffer.from(updatedPng, "base64");
    await writeFile(source, changedBytes);
    const modifiedAt = new Date(Date.now() + 5000);
    await utimes(source, modifiedAt, modifiedAt);
    await library.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(thumbnail).not.toHaveAttribute("src", previousUrl!);
    await expect
      .poll(() =>
        thumbnail.evaluate((image: HTMLImageElement) => ({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      )
      .toEqual({ width: 2, height: 3 });
    expect(await readFile(source)).toEqual(changedBytes);
    await page.getByRole("radio", { name: "Videos", exact: true }).click();
    await page.getByRole("button", { name: "Abrir carpeta de videos", exact: true }).click();
    await expect
      .poll(() => openedFolderIdentity(instance))
      .toEqual(await directoryIdentity(join(instance.home, "Videos")));
    await expect(page.getByRole("radio", { name: "YouTube", exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "Imágenes", exact: true }).click();
    await writeFile(join(instance.home, "Images", "added.png"), PNG);
    await page.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(page.getByTitle(/^added:/)).toBeVisible();
    await unlink(join(instance.home, "Images", "added.png"));
    await page.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(page.getByTitle(/^added:/)).toHaveCount(0);
    await writeFile(join(instance.home, "Images", "added.png"), PNG);
    await page.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(page.getByTitle(/^added:/)).toBeVisible();
  } finally {
    await instance.close();
  }
});

test("a video served by iris-media can seek", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await createVideoFixture(page, join(instance.home, "Videos"));
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await expect(page.getByTitle(/^fixture:/)).toHaveCount(0);
    await page.getByRole("radio", { name: "Videos", exact: true }).click();
    await page.getByRole("button", { name: "Actualizar biblioteca", exact: true }).click();
    await expect(page.getByTitle(/^fixture:/)).toBeVisible();
    const videoRow = page
      .getByRole("region", { name: "Biblioteca", exact: true })
      .getByTitle(/^fixture:/);
    await expect(videoRow.getByText("fixture", { exact: true })).toBeVisible();
    await expect(videoRow.locator("video")).toBeVisible();
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
