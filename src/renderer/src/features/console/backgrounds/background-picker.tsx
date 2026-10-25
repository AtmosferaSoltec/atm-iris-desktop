import { ImagePlay, Pin, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@renderer/components/ui/popover";
import { Spinner } from "@renderer/components/ui/spinner";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { useMediaUpload } from "@renderer/features/media/upload/use-media-upload";
import type { ProjectionBackground } from "@renderer/features/projection/model";
import type { LiveConsole } from "../use-live-console";
import { backgroundFor, setSongBackground } from "./actions";
import { BackgroundSwatch } from "./background-swatch";

/**
 * FONDOS (IRIS_SPEC §6.5): black (no background) and the church's own, and the card that
 * adds a new one. There are none by default: the lyrics show on black.
 */
export function BackgroundPicker({ ctrl }: { ctrl: LiveConsole }) {
  const [deleting, setDeleting] = useState<ProjectionBackground | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const { addBackground, removeBackground } = ctrl;
  // The song on the screens (or the open one): its own background can be set from here.
  const song = songOf(ctrl);
  const [isSaving, startSave] = useTransition();
  const isSongsBackground = song !== null && song.backgroundId === (ctrl.backgroundId ?? null);
  // Out of the popover: an upload keeps going (and lands) after it closes.
  const upload = useMediaUpload("background", {
    onUploaded: async (asset) => {
      const result = await backgroundFor(asset.id);
      if (!result.background) {
        toast.error(result.error ?? "No pudimos mostrar el fondo.");
        return;
      }
      addBackground(result.background);
      toast.success(`Fondo «${asset.title}» listo`);
    },
  });
  const uploading = upload.items.filter(
    (item) => item.status !== "done" && item.status !== "error",
  );
  const failed = upload.items.filter((item) => item.status === "error");

  function saveFor(songId: string, backgroundId: string | null) {
    startSave(async () => {
      const result = await setSongBackground(songId, backgroundId);
      if (result.error) toast.error(result.error);
      else {
        ctrl.setSongBackground(songId, backgroundId);
        toast.success(
          backgroundId ? "Fondo guardado en la canción" : "La canción ya no tiene fondo propio",
        );
      }
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Cambiar el fondo de la pantalla"
          className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface data-[state=open]:bg-surface"
        >
          <ImagePlay aria-hidden className="size-4 text-rose" />
          Fondo
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px]">
        <h3 className="mb-3 eyebrow text-ink-2">Fondos</h3>
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto p-0.5">
          <BackgroundSwatch
            name="Negro"
            isSelected={ctrl.backgroundId === null}
            onSelect={() => ctrl.setBackgroundId(null)}
          />
          {ctrl.backgrounds.map((background) => (
            <BackgroundSwatch
              key={background.id}
              name={background.name}
              background={background}
              isSelected={ctrl.backgroundId === background.id}
              state={ctrl.fileState(background.id)}
              onSelect={() => ctrl.setBackgroundId(background.id)}
              onDelete={() => setDeleting(background)}
            />
          ))}
          {uploading.map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <span className="grid aspect-video place-items-center rounded-sm ring-1 ring-line">
                <Spinner className="size-4 text-ink-2" />
              </span>
              <span className="truncate text-xs text-ink-2">{item.title}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void upload.importFiles()}
            className="flex cursor-pointer flex-col gap-1.5 text-left"
          >
            <span className="grid aspect-video place-items-center rounded-sm border border-dashed border-line-strong text-ink-2 transition hover:border-coral hover:text-ink">
              <Plus className="size-5" />
            </span>
            <span className="truncate text-xs text-ink-2">Agregar fondo</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            void invoke("projection:set-default-background", ctrl.backgroundId).then(() =>
              toast.success("Fondo predeterminado guardado"),
            )
          }
          className="mt-3 text-xs font-medium text-ink-2 hover:text-ink"
        >
          Usar como fondo predeterminado
        </button>
        {song && (
          <div className="mt-3 border-t border-line pt-3">
            {isSongsBackground ? (
              <div className="flex items-center justify-between gap-3 text-xs text-ink-2">
                <span className="min-w-0 truncate">Es el fondo de «{song.title}»</span>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveFor(song.refId, null)}
                  className="shrink-0 cursor-pointer font-medium text-ink hover:underline disabled:opacity-60"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveFor(song.refId, ctrl.backgroundId)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-medium text-ink hover:bg-surface disabled:opacity-60"
                title="Cada vez que presentes esta canción, este fondo se pone solo. Puedes cambiarlo sin que se guarde."
              >
                <Pin aria-hidden className="size-3.5 shrink-0 text-ink-2" />
                <span className="min-w-0 truncate">Usar este fondo siempre en «{song.title}»</span>
              </button>
            )}
          </div>
        )}
        {failed.map((item) => (
          <p key={item.id} role="alert" className="mt-3 text-xs font-medium text-danger">
            {item.title}: {item.error}
          </p>
        ))}
      </PopoverContent>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        isPending={isDeleting}
        title={`¿Eliminar el fondo «${deleting?.name}»?`}
        description="Se borra el archivo. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() =>
          startDelete(async () => {
            if (!deleting) return;
            const result = await invoke("media:delete", deleting.id)
              .then(() => ({ error: undefined as string | undefined }))
              .catch((error) => ({ error: errorMessage(error) }));
            if (result.error) toast.error(result.error);
            else removeBackground(deleting.id);
            setDeleting(null);
          })
        }
      />
    </Popover>
  );
}

/** The song on the screens, or the open one when none is: where "usar siempre" applies. */
function songOf(ctrl: LiveConsole) {
  const key = ctrl.live?.key ?? ctrl.openKey;
  const item = ctrl.items.find((candidate) => candidate.planItemId === key) ?? ctrl.openItem;
  if (!item || item.kind !== "song") return null;
  return { refId: item.refId, title: item.title, backgroundId: item.backgroundId ?? null };
}
