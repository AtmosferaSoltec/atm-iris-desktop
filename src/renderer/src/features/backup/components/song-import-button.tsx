import { FileUp } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import type { SongImportPreview, SongImportStatus } from "@shared/schemas/song-import";
import { confirmSongImport, previewSongImport } from "../actions";

const STATUS_TEXT: Record<SongImportStatus, string> = {
  new: "Se importará",
  duplicate: "Ya existe",
  invalid: "No se puede importar",
};
const STATUS_TONE: Record<SongImportStatus, string> = {
  new: "text-success",
  duplicate: "text-ink-2",
  invalid: "text-danger",
};

export function SongImportButton({ onError }: { onError: (message: string | null) => void }) {
  const [isReading, startReading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [preview, setPreview] = useState<SongImportPreview | null>(null);

  const count = (status: SongImportStatus): number =>
    preview?.items.filter((item) => item.status === status).length ?? 0;

  function choose() {
    onError(null);
    startReading(async () => {
      const result = await previewSongImport();
      if (result.error) onError(result.error);
      else if (result.preview) setPreview(result.preview);
    });
  }

  function save() {
    if (!preview) return;
    startSaving(async () => {
      const result = await confirmSongImport(preview.token);
      if (result.error) {
        onError(result.error);
        setPreview(null);
        return;
      }
      const { imported, duplicates, invalid } = result.result!;
      setPreview(null);
      toast.success(
        `Se importaron ${plural(imported, "canción", "canciones")}` +
          (duplicates ? `; ${duplicates} ya estaban` : "") +
          (invalid ? `; ${invalid} no se pudieron importar` : ""),
      );
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={<FileUp className="size-4" />}
        onClick={choose}
        isLoading={isReading}
      >
        Importar canciones
      </Button>
      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Importar canciones"
        size="lg"
        description={
          preview
            ? `${preview.fileName} · ${plural(count("new"), "canción nueva", "canciones nuevas")}, ${count("duplicate")} repetidas, ${count("invalid")} con problemas`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={save} isLoading={isSaving} disabled={count("new") === 0}>
              {count("new") === 0
                ? "No hay canciones nuevas"
                : `Importar ${plural(count("new"), "canción", "canciones")}`}
            </Button>
          </div>
        }
      >
        <ul className="flex max-h-[50dvh] flex-col divide-y divide-line overflow-y-auto pb-2">
          {preview?.items.map((item, index) => (
            <li key={index} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-ink-2">
                  {item.author || "Sin autor"} ·{" "}
                  {plural(item.slides, "diapositiva", "diapositivas")}
                </p>
              </div>
              <p className={`shrink-0 text-xs font-medium ${STATUS_TONE[item.status]}`}>
                {item.reason ?? STATUS_TEXT[item.status]}
              </p>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
