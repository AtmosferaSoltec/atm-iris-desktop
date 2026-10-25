import type { MediaRole, LocalMediaAsset } from "@shared/domain/models";
import type { IpcResult } from "@shared/ipc/contract";
import type { IrisApi } from "@shared/ipc/contract";

declare global {
  interface Window {
    iris: IrisApi & {
      importDropped: (files: File[], role: MediaRole) => Promise<IpcResult<LocalMediaAsset[]>>;
    };
  }
}
