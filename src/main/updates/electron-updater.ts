import updater from "electron-updater";
import { logError } from "../app/logging";
import type { UpdatePort } from "./update-service";

/** App identity/feed are packaged by electron-builder, never supplied by the renderer. */
export function createUpdatePort(isPersonal: boolean): UpdatePort {
  const { autoUpdater } = updater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.channel = isPersonal ? "personal" : "latest";
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = null;
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
