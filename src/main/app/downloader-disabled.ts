import { AppError } from "@shared/errors";
import type { DownloaderHandlers } from "./downloader-context";

export function createDownloaderHandlers(): DownloaderHandlers {
  const unavailable = (): never => {
    throw new AppError(
      "NOT_FOUND",
      "Las descargas solo están disponibles en la edición personal de Iris.",
    );
  };
  return {
    "downloader:status": () => ({
      isAvailable: false,
      isEnabled: false,
      isInstalling: false,
      version: null,
      hasFfmpeg: false,
      updateError: null,
      job: null,
    }),
    "downloader:help": unavailable,
    "downloader:enable": unavailable,
    "downloader:install": unavailable,
    "downloader:configure": unavailable,
    "downloader:start": unavailable,
    "downloader:cancel": unavailable,
  };
}
