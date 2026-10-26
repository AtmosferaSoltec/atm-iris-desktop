import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@renderer/components/ui/panel";
import { Button } from "@renderer/components/ui/button";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { fileSize } from "@shared/lib/format";
import type { LocalMediaAsset } from "@shared/domain/models";
import { errorMessage } from "@shared/errors";
import { BackupPanel } from "./backup-panel";
import { ErasePanel } from "./erase-panel";

const FOLDER_LABELS: Record<string, string> = {
  Audio: "Pistas",
  Videos: "Videos",
  Images: "Imágenes",
  Backgrounds: "Fondos",
  Sounds: "Sonidos",
  Database: "Base de datos",
};
export function MaintenancePanels() {
  const client = useQueryClient();
  useEffect(
    () =>
      window.iris.onEvent("media:changed", () => {
        void client.invalidateQueries({ queryKey: ["storage"] });
      }),
    [client],
  );
  const storage = useQuery({
    queryKey: ["storage", "details"],
    queryFn: () => invoke("storage:details", undefined),
  });
  const info = useQuery({
    queryKey: ["app", "info"],
    queryFn: () => invoke("app:info", undefined),
  });
  const [removing, setRemoving] = useState<LocalMediaAsset | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const remove = useMutation({
    mutationFn: (id: string) => invoke("media:delete", id),
    meta: { handlesErrors: true },
    onSuccess: async () => {
      setRemoving(null);
      await client.invalidateQueries();
    },
    onError: (error) => setDeleteError(errorMessage(error)),
  });
  const snapshot = useMutation({
    mutationFn: () => invoke("backup:snapshot", undefined),
    onSuccess: () => toast.success("Respaldo creado"),
  });
  const folder = useMutation({
    mutationFn: (name: "home" | "logs") => invoke("app:open-folder", name),
  });
  return (
    <>
      <Panel
        title="Almacenamiento"
        description="Las pistas de las canciones, los fondos y la multimedia viven en la carpeta de Iris."
      >
        {storage.data && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3">
              {storage.data.folders.map((item) => (
                <div key={item.name}>
                  <dt className="text-sm text-ink-2">{FOLDER_LABELS[item.name]}</dt>
                  <dd className="font-semibold">{fileSize(item.bytes)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-ink-2">Espacio libre: {fileSize(storage.data.freeBytes)}</p>
            <div>
              <h3 className="font-semibold">Archivos sin uso</h3>
              {storage.data.unused.length === 0 ? (
                <p className="text-sm text-ink-2">No hay archivos sin uso.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {storage.data.unused.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm">{asset.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteError(undefined);
                          setRemoving(asset);
                        }}
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {storage.data.missing.length > 0 && (
              <div>
                <h3 className="font-semibold">Archivos no encontrados</h3>
                <p className="text-sm text-ink-2">
                  Vuelve a colocar el archivo en su carpeta o quita su registro.
                </p>
                <ul>
                  {storage.data.missing.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm">{asset.title} · Archivo no encontrado</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteError(undefined);
                          setRemoving(asset);
                        }}
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                void invoke("media:scan", undefined)
                  .then(() => client.invalidateQueries({ queryKey: ["storage"] }))
                  .catch((error) => toast.error(errorMessage(error)))
              }
            >
              Buscar archivos
            </Button>
          </div>
        )}
      </Panel>
      <Panel
        title="Respaldo"
        description="Guarda las letras de tus canciones en un archivo e impórtalo en esta o en otra instalación de Iris. Las pistas, imágenes y videos subidos no viajan en el archivo."
      >
        <div className="flex flex-col gap-5">
          <BackupPanel />
          <div className="border-t border-line pt-5">
            <Button
              variant="secondary"
              onClick={() => snapshot.mutate()}
              isLoading={snapshot.isPending}
            >
              Crear respaldo ahora
            </Button>
            <p className="mt-3 text-sm text-ink-2">
              Iris guarda un respaldo automático de la base de datos cada día y conserva los últimos
              siete. Para restaurarlo, cierra Iris y reemplaza Database/iris.db por una copia de un
              archivo de Backups. Conserva una copia de la base actual antes de reemplazarla. Los
              archivos multimedia se respaldan por separado.
            </p>
          </div>
        </div>
      </Panel>
      <Panel
        title="Empezar de cero"
        description="Elimina de golpe lo que elijas. Se borra también del servicio en curso."
      >
        <ErasePanel />
      </Panel>
      <Panel title="Acerca de">
        <div className="flex flex-col gap-3">
          <p className="font-semibold">Iris {info.data?.version}</p>
          <p className="text-sm break-all text-ink-2">{info.data?.homePath}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => folder.mutate("home")}>
              Abrir carpeta de Iris
            </Button>
            <Button variant="secondary" onClick={() => folder.mutate("logs")}>
              Abrir carpeta de registros
            </Button>
          </div>
        </div>
      </Panel>
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        isPending={remove.isPending}
        error={deleteError}
        title={`¿Quitar «${removing?.title ?? ""}»?`}
        description="Se enviará el archivo a la papelera y se quitará del servicio."
        confirmLabel="Quitar"
      />
    </>
  );
}
