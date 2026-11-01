import { FolderOutput } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import { EXPORT_FOLDERS, type ExportFolder } from "@shared/schemas/backup";
import { exportFiles } from "../actions";

const LABELS: Record<ExportFolder, string> = {
  Audio: "Pistas de las canciones (MP3)",
  Backgrounds: "Fondos",
  Images: "Imágenes",
  Videos: "Videos",
  Sounds: "Sonidos",
};

export function ExportFilesButton({ onError }: { onError: (message: string | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<ExportFolder>>(new Set(EXPORT_FOLDERS));
  const [isCopying, startCopying] = useTransition();

  function copy() {
    onError(null);
    startCopying(async () => {
      const result = await exportFiles([...chosen]);
      if (result.error) {
        onError(result.error);
        setIsOpen(false);
      } else if (result.result && !result.result.isCanceled) {
        setIsOpen(false);
        toast.success(
          result.result.files
            ? `Se copiaron ${plural(result.result.files, "archivo", "archivos")}`
            : "No había archivos para copiar en lo que elegiste",
        );
      }
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={<FolderOutput className="size-4" />}
        onClick={() => setIsOpen(true)}
      >
        Copiar archivos a una carpeta
      </Button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Copiar archivos"
        size="sm"
        description="Elige qué copiar. Después eliges la carpeta de destino; cada tipo queda en su propia subcarpeta y no se borra nada de Iris."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={copy} isLoading={isCopying} disabled={chosen.size === 0}>
              Elegir carpeta y copiar
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-2 pb-2">
          {EXPORT_FOLDERS.map((folder) => (
            <li key={folder}>
              <label className="flex cursor-pointer items-center gap-3 py-1 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-coral"
                  checked={chosen.has(folder)}
                  onChange={(event) =>
                    setChosen((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(folder);
                      else next.delete(folder);
                      return next;
                    })
                  }
                />
                {LABELS[folder]}
              </label>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
