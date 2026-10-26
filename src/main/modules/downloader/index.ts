import { app, dialog, shell } from "electron";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { DownloaderContext, DownloaderHandlers } from "../../app/downloader-context";
import { logError } from "../../app/logging";
import { DownloadController } from "./controller";
import { ToolManager } from "./tool-manager";

export function createDownloaderHandlers(context: DownloaderContext): DownloaderHandlers {
  const tools = new ToolManager(context.userData);
  const controller = new DownloadController(context, tools);
  // Interrupted jobs own only their private staging folders, never library files.
  void readdir(tools.directory)
    .then((names) =>
      Promise.all(
        names
          .filter((name) => /^\.download-[a-zA-Z0-9]+$/.test(name))
          .map((name) => rm(join(tools.directory, name), { recursive: true, force: true })),
      ),
    )
    .catch(() => {});
  const timer = setTimeout(() => {
    void controller.weeklyCheck().catch(logError);
  }, 5000);
  timer.unref();
  let isQuitting = false;
  app.on("before-quit", (event) => {
    clearTimeout(timer);
    if (!controller.isBusy() || isQuitting) return;
    event.preventDefault();
    isQuitting = true;
    void controller.dispose().finally(() => app.quit());
  });
  return {
    "downloader:help": async () => {
      const status = await controller.status();
      if (status.isEnabled) await shell.openExternal("https://ffmpeg.org/download.html");
    },
    "downloader:status": () => controller.status(),
    "downloader:enable": (isEnabled) => controller.enable(isEnabled),
    "downloader:install": () => controller.prepare(),
    "downloader:configure": async () => {
      const status = await controller.status();
      if (!status.isEnabled) return status;
      const selected = await dialog.showOpenDialog({
        title: "Seleccionar carpeta de FFmpeg y FFprobe",
        properties: ["openDirectory"],
      });
      return selected.canceled || !selected.filePaths[0]
        ? status
        : controller.prepare(selected.filePaths[0]);
    },
    "downloader:start": (input) => controller.start(input),
    "downloader:cancel": () => controller.cancel(),
  };
}
