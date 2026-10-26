import { resolve } from "node:path";
import type { Plugin } from "vite";

export function optionalDownloader(isPersonal: boolean, target: "main" | "renderer"): Plugin {
  const id = `virtual:iris-downloader-${target}`;
  return {
    name: `iris-optional-downloader-${target}`,
    resolveId(source) {
      return source === id ? `\0${id}` : undefined;
    },
    load(source) {
      if (source !== `\0${id}`) return;
      if (target === "main")
        return `export const isPersonalBuild = ${isPersonal}; export { createDownloaderHandlers } from ${JSON.stringify(resolve(isPersonal ? "src/main/modules/downloader/index.ts" : "src/main/app/downloader-disabled.ts"))};`;
      return isPersonal
        ? `export { DownloaderDialog } from ${JSON.stringify(resolve("src/renderer/src/features/downloader/downloader-dialog.tsx"))}; export const isDownloaderAvailable = true;`
        : "export const isDownloaderAvailable = false; export const DownloaderDialog = () => null;";
    },
  };
}
