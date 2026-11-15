import type { MediaRole, LocalMediaAsset } from "@shared/domain/models";
import type { IpcResult } from "@shared/ipc/contract";
import type { TrackChoice } from "@shared/schemas/media";
import type { IrisApi } from "@shared/ipc/contract";

declare global {
  interface Window {
    iris: IrisApi & {
      chooseTrack: (file: File, songId?: string) => Promise<IpcResult<TrackChoice>>;
      importDropped: (files: File[], role: MediaRole) => Promise<IpcResult<LocalMediaAsset[]>>;
    };
  }
}
