import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LocalMediaAsset, MediaKind, MediaRole } from "@shared/domain/models";
import { errorMessage, AppError } from "@shared/errors";
import { createId } from "@shared/id";
import { invoke } from "@renderer/lib/ipc";
import { toast } from "@renderer/components/ui/toaster";
import { measureMediaUrl } from "./measure";

export type UploadItem = {
  id: string;
  title: string;
  fileName: string;
  kind: MediaKind | null;
  sizeBytes: number;
  status: "measuring" | "requesting" | "uploading" | "confirming" | "done" | "error";
  error?: string;
  canRetry: boolean;
};
export const mediaKeys = { all: ["media"] as const };
export const assetUrl = (id: string): string => `iris-media://asset/${id}`;

export function useMediaUpload(
  role: MediaRole,
  options: { onUploaded?: (asset: LocalMediaAsset) => void | Promise<void> } = {},
): {
  items: UploadItem[];
  isImporting: boolean;
  importFiles: (files?: File[]) => Promise<void>;
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
} {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const client = useQueryClient();
  useEffect(
    () =>
      window.iris.onEvent("media:import-progress", (progress) => {
        setItems((previous) => {
          const current = previous.find(
            (item) => item.fileName === progress.fileName && item.status === "uploading",
          );
          if (current) return previous;
          return [
            ...previous,
            {
              id: createId(),
              title: progress.fileName,
              fileName: progress.fileName,
              kind: null,
              sizeBytes: progress.totalBytes,
              status: "uploading",
              canRetry: false,
            },
          ];
        });
      }),
    [],
  );
  async function importFiles(files?: File[]): Promise<void> {
    setIsImporting(true);
    try {
      let assets: LocalMediaAsset[];
      if (files) {
        const result = await window.iris.importDropped(files, role);
        if (!result.ok)
          throw new AppError(result.error.code, result.error.message, result.error.fields);
        assets = result.data;
      } else assets = await invoke("media:import", { role });
      setItems((previous) => previous.filter((item) => item.status !== "uploading"));
      for (const asset of assets) {
        setItems((previous) => [
          ...previous.filter((item) => item.fileName !== asset.fileName),
          {
            id: asset.id,
            title: asset.title,
            fileName: asset.fileName,
            kind: asset.kind,
            sizeBytes: asset.sizeBytes,
            status: "measuring",
            canRetry: false,
          },
        ]);
        try {
          const measures = await measureMediaUrl(assetUrl(asset.id), asset.kind);
          const measured = await invoke("media:set-measures", { id: asset.id, ...measures });
          await options.onUploaded?.(measured);
          setItems((previous) =>
            previous.map((item) => (item.id === asset.id ? { ...item, status: "done" } : item)),
          );
        } catch (error) {
          if (role === "track")
            await invoke("media:discard-track", asset.id).catch(() => undefined);
          setItems((previous) =>
            previous.map((item) =>
              item.id === asset.id
                ? { ...item, status: "error", error: errorMessage(error) }
                : item,
            ),
          );
        }
      }
    } catch (error) {
      const message = errorMessage(error);
      toast.error(message);
      setItems((previous) =>
        previous.map((item) =>
          item.status === "uploading" ? { ...item, status: "error", error: message } : item,
        ),
      );
    } finally {
      setIsImporting(false);
      await client.invalidateQueries({ queryKey: mediaKeys.all });
    }
  }
  return {
    items,
    isImporting,
    importFiles,
    onDismiss: (id) => setItems((previous) => previous.filter((item) => item.id !== id)),
    onClearFinished: () =>
      setItems((previous) =>
        previous.filter((item) => item.status !== "done" && item.status !== "error"),
      ),
  };
}
