declare module "virtual:iris-downloader-main" {
  import type { DownloaderContext, DownloaderHandlers } from "@main/app/downloader-context";
  export const isPersonalBuild: boolean;
  export function createDownloaderHandlers(context: DownloaderContext): DownloaderHandlers;
}
