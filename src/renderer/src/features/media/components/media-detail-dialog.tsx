import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { ConfirmDialog, Dialog } from "@renderer/components/ui/dialog";
import { useForm } from "react-hook-form";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage, toFormErrors } from "@shared/errors";
import { TextArea } from "@renderer/components/ui/text-area";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import type { MediaAsset } from "@shared/domain/models";
import { fileFacts, KIND_LABELS } from "../media-format";

type Props = {
  asset: MediaAsset;
  /** Asset protocol URL; null for missing files. */
  url: string | null;
  onClose: () => void;
  /** Its title or description changed. */
  onSaved?: () => void;
  onDeleted?: () => void;
};

export function MediaDetailDialog({ asset, url, onClose, onSaved, onDeleted }: Props) {
  const isMissing = "isMissing" in asset && asset.isMissing === true;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ title: string; description: string }>({
    defaultValues: { title: asset.title, description: asset.description ?? "" },
  });
  async function save(input: { title: string; description: string }): Promise<void> {
    try {
      await invoke("media:update", { id: asset.id, ...input });
      toast.success("Cambios guardados");
      onSaved?.();
    } catch (error) {
      const mapped = toFormErrors(error, ["title", "description"] as const);
      for (const field of ["title", "description"] as const)
        if (mapped.fields[field]) setError(field, { message: mapped.fields[field] });
      if (mapped.message) setError("root", { message: mapped.message });
    }
  }
  function confirmDelete(): void {
    startTransition(async () => {
      try {
        await invoke("media:delete", asset.id);
        toast.success(`Se eliminó «${asset.title}»`);
        setIsConfirmingDelete(false);
        onDeleted?.();
        onClose();
      } catch (error) {
        setDeleteError(errorMessage(error));
      }
    });
  }

  return (
    <Dialog open onClose={onClose} size="lg" title={asset.title} description={fileFacts(asset)}>
      <div className="grid gap-6 pb-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Preview asset={asset} url={url} />

        <div className="flex flex-col gap-5">
          <form onSubmit={handleSubmit(save)} className="flex flex-col gap-4" noValidate>
            {errors.root?.message && <Banner tone="error">{errors.root.message}</Banner>}
            <TextField
              id="title"
              label="Título"
              {...register("title")}
              error={errors.title?.message}
            />
            <TextArea
              id="description"
              label="Descripción"
              placeholder="Opcional"
              {...register("description")}
              error={errors.description?.message}
              className="min-h-24"
            />
            <div>
              <Button type="submit" variant="secondary" isLoading={isSubmitting}>
                Guardar
              </Button>
            </div>
          </form>

          <div className="mt-auto flex flex-col items-start gap-3 border-t border-line pt-4">
            {isMissing && (
              <>
                <Banner tone="error">No encontramos el archivo.</Banner>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void invoke("media:reveal", asset.id).catch((error) =>
                      toast.error(errorMessage(error)),
                    )
                  }
                >
                  Buscar en la carpeta
                </Button>
              </>
            )}
            {!isMissing && asset.kind !== "audio" && (
              <Button
                variant="secondary"
                onClick={() =>
                  void invoke("media:change-role", {
                    id: asset.id,
                    role: asset.isBackground ? "library" : "background",
                  })
                    .then(() => onSaved?.())
                    .catch((error) => toast.error(errorMessage(error)))
                }
              >
                {asset.isBackground ? "Quitar de fondos" : "Usar como fondo"}
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-danger hover:text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => {
                setDeleteError(undefined);
                setIsConfirmingDelete(true);
              }}
            >
              {isMissing ? "Quitar" : "Eliminar"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        isPending={isPending}
        error={deleteError}
        title={`¿Eliminar «${asset.title}»?`}
        description="Se quitará de la biblioteca y de las consolas."
        confirmLabel="Eliminar"
      />
    </Dialog>
  );
}

function Preview({ asset, url }: { asset: MediaAsset; url: string | null }) {
  if (!url) {
    return (
      <div className="grid aspect-video place-items-center rounded-md bg-surface text-sm text-ink-2 ring-1 ring-line">
        No pudimos cargar la vista previa.
      </div>
    );
  }
  if (asset.kind === "image") {
    return (
      <img
        src={url}
        alt={asset.title}
        className="aspect-video w-full rounded-md bg-black object-contain ring-1 ring-line"
      />
    );
  }
  if (asset.kind === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        aria-label={asset.title}
        className="aspect-video w-full rounded-md bg-black ring-1 ring-line"
      />
    );
  }
  return (
    <div className="flex flex-col justify-center gap-4 rounded-md bg-surface p-6 ring-1 ring-line">
      <p className="eyebrow text-ink-2">{KIND_LABELS.audio.singular}</p>
      <audio src={url} controls preload="metadata" aria-label={asset.title} className="w-full" />
    </div>
  );
}
