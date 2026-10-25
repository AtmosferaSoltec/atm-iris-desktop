import { createVideoFixture } from "./video-fixture";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=",
  "base64",
);
test("projects to a preview window, clears and restores, changes background and stops", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await writeFile(join(instance.home, "Backgrounds", "Fondo de prueba.png"), PNG);
    await page.evaluate(async () => {
      await window.iris["songs:create"]({
        title: "Canción proyectada",
        author: "",
        sections: [{ label: "Estrofa", text: "Sublime gracia del Señor" }],
        audioId: null,
        youtubeId: null,
      });
      await window.iris["media:scan"]();
      const assets = await window.iris["media:list"]({
        role: "background",
        kind: "all",
        search: "",
        page: 1,
        limit: 50,
      });
      if (assets.ok)
        for (const asset of assets.data.data)
          await window.iris["media:set-measures"]({
            id: asset.id,
            width: 1,
            height: 1,
            durationSeconds: null,
          });
    });
    await page.reload();
    await page
      .getByRole("region", { name: "Biblioteca", exact: true })
      .getByText("Canción proyectada", { exact: true })
      .dblclick();
    await page.getByRole("button", { name: "Proyectar", exact: true }).click();
    const opened = instance.app.waitForEvent("window");
    await page.getByRole("button", { name: "Iniciar proyección", exact: true }).click();
    const projection = await opened;
    await projection.waitForLoadState();
    await page.getByRole("button", { name: "Enviar a la pantalla: Estrofa", exact: true }).click();
    await expect(projection.getByText("Sublime gracia del Señor", { exact: true })).toBeVisible();
    await page.keyboard.press("b");
    await expect(projection.getByText("Sublime gracia del Señor", { exact: true })).toHaveCount(0);
    await page.keyboard.press("b");
    await expect(projection.getByText("Sublime gracia del Señor", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fondo", exact: true }).click();
    await page.getByRole("button", { name: "Fondo de prueba", exact: true }).click();
    await expect(projection.locator("img")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Proyectando", exact: true }).click();
    await page.getByRole("button", { name: "Detener proyección", exact: true }).click();
    await expect.poll(() => instance.app.windows().length).toBe(1);
  } finally {
    await instance.close();
  }
});

test("video reports its time from the projection and screen muting leaves preview muted", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    const source = await createVideoFixture(page, instance.home, 8000);
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [path],
      })) as typeof dialog.showOpenDialog;
    }, source);
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await page.getByRole("radio", { name: "Videos", exact: true }).click();
    await page.getByRole("button", { name: "Subir videos", exact: true }).click();
    const library = page.getByRole("region", { name: "Biblioteca", exact: true });
    const service = page.getByRole("region", { name: "Servicio", exact: true });
    await expect(library.getByTitle(/^fixture:/)).toBeVisible();
    const box = await library.getByTitle(/^fixture:/).boundingBox();
    const target = await service.boundingBox();
    if (!box || !target) throw new Error("No encontramos el video.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(75);
    await expect(page.getByRole("heading", { name: "fixture", exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.iris.onEvent("projection:video-time", (time) =>
        Reflect.set(window, "lastVideoTime", time),
      );
    });
    await page.getByRole("button", { name: "Proyectar", exact: true }).click();
    const opened = instance.app.waitForEvent("window");
    await page.getByRole("button", { name: "Iniciar proyección", exact: true }).click();
    const output = await opened;
    await page.getByRole("button", { name: "Reproducir", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(
            (Reflect.get(window, "lastVideoTime") as { position?: number } | undefined)?.position ??
              0,
          ),
        ),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(output.locator("video")).toHaveCount(1);
    expect(await output.locator("video").evaluate((video: HTMLVideoElement) => video.muted)).toBe(
      false,
    );
    expect(
      await page
        .getByRole("region", { name: "Pantalla en vivo", exact: true })
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.muted),
    ).toBe(true);
    await page.getByRole("button", { name: "Silenciar en pantalla", exact: true }).click();
    await expect
      .poll(() => output.locator("video").evaluate((video: HTMLVideoElement) => video.muted))
      .toBe(true);
  } finally {
    await instance.close();
  }
});
