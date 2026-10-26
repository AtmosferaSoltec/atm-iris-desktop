import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers";
import type { DownloaderStatus } from "../src/shared/schemas/downloader";

test("keeps the downloader outside standard builds and handles the personal setup, formats, progress and cancel UI", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Herramientas", exact: true }).click();
    const status = await page.evaluate(() => window.iris["downloader:status"](undefined));
    if (!status.ok) throw new Error(status.error.message);
    if (!status.data.isAvailable) {
      await expect(page.getByRole("button", { name: "Descargar", exact: true })).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          window.iris["downloader:start"]({
            url: "https://youtu.be/M7lc1UVf-VE",
            format: "mp3",
            quality: "720",
            audioRole: "track",
          }),
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      return;
    }
    await page.getByRole("button", { name: "Descargar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Descargas personales", exact: true });
    await dialog.getByRole("button", { name: "Activar descargas personales", exact: true }).click();
    await expect(dialog.getByLabel("Enlace de YouTube", { exact: true })).toBeVisible();
    // Simulate external tools; actual download/import/cancellation rules have separate service tests.
    await instance.app.evaluate(({ ipcMain }) => {
      const state: DownloaderStatus = {
        isAvailable: true,
        isEnabled: true,
        isInstalling: false,
        version: null,
        hasFfmpeg: false,
        updateError: null,
        job: null,
      };
      Reflect.set(globalThis, "downloadTestState", state);
      for (const channel of [
        "downloader:status",
        "downloader:install",
        "downloader:configure",
        "downloader:start",
        "downloader:cancel",
      ])
        ipcMain.removeHandler(channel);
      ipcMain.handle("downloader:status", () => ({ ok: true, data: state }));
      ipcMain.handle("downloader:install", () => {
        state.version = "2026.10.14";
        return { ok: true, data: state };
      });
      ipcMain.handle("downloader:configure", () => {
        state.hasFfmpeg = true;
        return { ok: true, data: state };
      });
      ipcMain.handle("downloader:start", (_event, input: unknown) => {
        Reflect.set(globalThis, "downloadTestInput", input);
        state.job = {
          id: "test",
          phase: "downloading",
          title: "Video de prueba",
          progress: 40,
          message: null,
          assetId: null,
        };
        return { ok: true, data: state.job };
      });
      ipcMain.handle("downloader:cancel", () => {
        state.job!.phase = "cancelled";
        state.job!.message = "Descarga cancelada.";
        return { ok: true, data: undefined };
      });
    });
    await dialog.getByRole("button", { name: "Preparar herramienta", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Actualizar herramienta", exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Seleccionar FFmpeg", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Cambiar FFmpeg", exact: true })).toBeVisible();
    await dialog
      .getByLabel("Enlace de YouTube", { exact: true })
      .fill("https://youtu.be/M7lc1UVf-VE");
    await dialog.getByRole("radio", { name: "Solo audio (MP3)", exact: true }).click();
    await dialog.getByRole("button", { name: "Descargar", exact: true }).click();
    await expect(
      dialog.getByRole("progressbar", { name: "Progreso de descarga", exact: true }),
    ).toHaveAttribute("value", "40");
    expect(
      await instance.app.evaluate(() => Reflect.get(globalThis, "downloadTestInput")),
    ).toMatchObject({ format: "mp3", audioRole: "track" });
    await dialog.getByRole("button", { name: "Cancelar operación", exact: true }).click();
    await expect(dialog.getByText("Descarga cancelada.", { exact: true })).toBeVisible();
    await dialog.getByRole("radio", { name: "Video (MP4)", exact: true }).click();
    await dialog.getByLabel("Calidad", { exact: true }).selectOption("360");
    await dialog.getByRole("button", { name: "Descargar", exact: true }).click();
    await expect
      .poll(() => instance.app.evaluate(() => Reflect.get(globalThis, "downloadTestInput")))
      .toMatchObject({ format: "mp4", quality: "360" });
    await instance.app.evaluate(() => {
      const state = Reflect.get(globalThis, "downloadTestState") as DownloaderStatus;
      state.job = {
        ...state.job!,
        phase: "completed",
        progress: 100,
        assetId: "asset-test",
        message: "Video guardado en Iris/Videos.",
      };
    });
    await expect(dialog.getByText("Video guardado en Iris/Videos.", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("personal-downloader.png") });
  } finally {
    await instance.close();
  }
});
