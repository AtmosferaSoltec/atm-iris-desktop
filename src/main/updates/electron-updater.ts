import updater from "electron-updater";
import { logError, logMessage } from "../app/logging";
import type { UpdatePort } from "./update-service";

/** The feed (our own server) is baked into the package by electron-builder: never supplied by the renderer. */
export function createUpdatePort(): UpdatePort {
  const { autoUpdater } = updater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  // The updater's own trace lets us diagnose a failed install from iris.log.
  autoUpdater.logger = {
    info: (message) => logMessage(`[updater] ${String(message)}`),
    warn: (message) => logMessage(`[updater] ${String(message)}`),
    error: (message) => logMessage(`[updater] ${String(message)}`),
  };
  autoUpdater.on("error", logError);
  return {
    check: async () => (await autoUpdater.checkForUpdates())?.updateInfo.version ?? null,
    download: async (progress) => {
      const report = (value: { percent: number }): void => progress(value.percent);
      autoUpdater.on("download-progress", report);
      try {
        await autoUpdater.downloadUpdate();
      } finally {
        autoUpdater.off("download-progress", report);
      }
    },
    install: (failed) => {
      autoUpdater.once("error", failed);
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        autoUpdater.off("error", failed);
        throw error;
      }
    },
  };
}
