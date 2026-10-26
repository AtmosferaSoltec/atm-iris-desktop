declare module "virtual:iris-downloader-renderer" {
  import type { ReactNode } from "react";
  export const isDownloaderAvailable: boolean;
  export function DownloaderDialog(props: { onClose: () => void }): ReactNode;
}
