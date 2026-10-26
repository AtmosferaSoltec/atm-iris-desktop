import type { SettingsRepository } from "../repositories/types";
import type { MediaService } from "../services/media-service";
import type { IpcHandlers } from "../ipc/dispatch";

export type DownloaderContext = {
  settings: SettingsRepository;
  media: MediaService;
  userData: string;
  isE2e: boolean;
};
export type DownloaderHandlers = Pick<
  IpcHandlers,
  | "downloader:help"
  | "downloader:status"
  | "downloader:enable"
  | "downloader:install"
  | "downloader:configure"
  | "downloader:start"
  | "downloader:cancel"
>;
