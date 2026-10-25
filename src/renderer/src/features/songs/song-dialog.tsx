import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog } from "@renderer/components/ui/dialog";
import { Spinner } from "@renderer/components/ui/spinner";
import { Banner } from "@renderer/components/ui/banner";
import { invoke } from "@renderer/lib/ipc";
import { assetUrl } from "@renderer/features/media/upload/use-media-upload";
import { SongEditor } from "./components/song-editor";

export function SongDialog({
  songId,
  onClose,
  onSaved,
  onDeleted,
}: {
  songId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const loaded = useQuery({
    queryKey: ["songs", "detail", songId],
    queryFn: () => invoke("songs:get", songId!),
    enabled: Boolean(songId),
    staleTime: 0,
  });
  const media = useQuery({
    queryKey: ["media", "backgrounds"],
    queryFn: () =>
      invoke("media:list", { role: "background", kind: "all", search: "", page: 1, limit: 100 }),
  });
  const backgrounds = (media.data?.data ?? [])
    .filter((asset) => !asset.isMissing && !asset.needsMeasures)
    .map((asset) => ({
      id: asset.id,
      name: asset.title,
      colors: ["var(--color-black)", "var(--color-black)"],
      ...(asset.kind === "image"
        ? { imageUrl: assetUrl(asset.id) }
        : { videoUrl: assetUrl(asset.id) }),
      durationSeconds: asset.durationSeconds,
    }));
  const title = songId ? (loaded.data?.title ?? "Editar canción") : "Nueva canción";
  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      actionsRef={setActionsSlot}
      title={title}
      description="Escribe o busca la letra y pega el enlace de su pista en YouTube."
    >
      <div className="pb-6">
        {(songId && loaded.isPending) || media.isPending ? (
          <p className="flex items-center gap-2 py-16 text-sm text-ink-2">
            <Spinner className="size-4" />
            Abriendo la canción…
          </p>
        ) : loaded.isError || media.isError ? (
          <Banner tone="error">{loaded.error?.message ?? media.error?.message}</Banner>
        ) : (
          <SongEditor
            song={songId ? loaded.data : undefined}
            backgrounds={backgrounds}
            actionsSlot={actionsSlot}
            onSaved={onSaved}
            onDeleted={() => songId && onDeleted(songId)}
            onCancel={onClose}
          />
        )}
      </div>
    </Dialog>
  );
}
