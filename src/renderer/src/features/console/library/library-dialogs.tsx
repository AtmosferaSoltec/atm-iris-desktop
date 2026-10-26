import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { Banner } from "@renderer/components/ui/banner";
import { toast } from "@renderer/components/ui/toaster";
import { SongDialog } from "@renderer/features/songs/song-dialog";
import { MediaDetailDialog } from "@renderer/features/media/components/media-detail-dialog";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import type { ProjectionBackground } from "@shared/domain/projection";
import type { LibraryEntry } from "../model";
import type { Library } from "./use-library";
import { mediaFile } from "./actions";

export type LibraryDialog =
  | { kind: "song"; id: string | null }
  | { kind: "media"; id: string }
  | { kind: "delete"; entry: LibraryEntry };
export function LibraryDialogs({
  dialog,
  onClose,
  library,
}: {
  dialog: LibraryDialog | null;
  onClose: () => void;
  library: Library;
  backgrounds: ProjectionBackground[];
}) {
  if (!dialog) return null;
  if (dialog.kind === "song")
    return (
      <SongDialog
        songId={dialog.id}
        onClose={onClose}
        onSaved={(id) => {
          onClose();
          void library.refresh("song", id);
        }}
        onDeleted={(id) => {
          library.forget(id);
          onClose();
        }}
      />
    );
  if (dialog.kind === "media")
    return <MediaDialog id={dialog.id} onClose={onClose} library={library} />;
  return <DeleteDialog entry={dialog.entry} onClose={onClose} library={library} />;
}
function MediaDialog({
  id,
  onClose,
  library,
}: {
  id: string;
  onClose: () => void;
  library: Library;
}) {
  const query = useQuery({ queryKey: ["media", "detail", id], queryFn: () => mediaFile(id) });
  return query.data?.asset ? (
    <MediaDetailDialog
      asset={query.data.asset}
      url={query.data.url ?? null}
      onClose={onClose}
      onSaved={() => void library.refresh("media", id)}
      onDeleted={() => library.forget(id)}
    />
  ) : query.data?.error ? (
    <Banner tone="error">{query.data.error}</Banner>
  ) : null;
}
function DeleteDialog({
  entry,
  onClose,
  library,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  library: Library;
}) {
  const [isPending, startDelete] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={`¿Eliminar «${entry.title}»?`}
      description={
        entry.kind === "song"
          ? "Se quita de la biblioteca y del servicio. Su audio se enviará a la papelera si no se utiliza."
          : "Se enviará el archivo a la papelera y se quitará del servicio."
      }
      confirmLabel="Eliminar"
      isPending={isPending}
      error={error}
      onConfirm={() =>
        startDelete(async () => {
          try {
            if (entry.kind === "song") await invoke("songs:delete", { id: entry.id });
            else if (entry.kind === "media") await invoke("media:delete", entry.id);
            library.forget(entry.id);
            toast.success(`Se eliminó «${entry.title}»`);
            onClose();
          } catch (error) {
            setError(errorMessage(error));
          }
        })
      }
    />
  );
}
