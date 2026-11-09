import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@renderer/components/ui/button";
import { Banner } from "@renderer/components/ui/banner";
import { Panel } from "@renderer/components/ui/panel";
import { invoke } from "@renderer/lib/ipc";

/**
 * "Actualizaciones": asks the server whether there is a newer Iris, on demand. It only reports:
 * a new version is installed when Iris is opened again, so searching never interrupts a service.
 */
export function UpdatesPanel() {
  const info = useQuery({
    queryKey: ["app", "info"],
    queryFn: () => invoke("app:info", undefined),
  });
  const look = useMutation({
    mutationFn: () => invoke("updates:look", undefined),
    meta: { handlesErrors: true },
  });
  const result = look.data;
  return (
    <Panel
      title="Actualizaciones"
      description={info.data ? `Versión instalada: ${info.data.version}` : undefined}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="secondary" onClick={() => look.mutate()} isLoading={look.isPending}>
            Buscar actualizaciones
          </Button>
        </div>
        {look.isError && <Banner tone="error">{look.error.message}</Banner>}
        {result && !result.isNewer && (
          <p role="status" className="text-sm text-ink-2">
            Iris está al día ({result.currentVersion}).
          </p>
        )}
        {result?.isNewer && (
          <Banner tone="info">
            Hay una versión nueva ({result.latestVersion}). Para instalarla, cierra Iris por
            completo cuando termines el servicio y ábrelo de nuevo: te pedirá actualizar. Tus
            canciones, Biblias y tiempos se conservan.
          </Banner>
        )}
      </div>
    </Panel>
  );
}
