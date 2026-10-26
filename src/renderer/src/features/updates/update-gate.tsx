import { useEffect, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { Surface } from "@renderer/components/ui/surface";
import { Button } from "@renderer/components/ui/button";
import { Banner } from "@renderer/components/ui/banner";
import { Spinner } from "@renderer/components/ui/spinner";
import { invoke } from "@renderer/lib/ipc";

const STATUS_KEY = ["updates", "status"];

/** Mount the workspace only after main has admitted this session. No modal escape bypass. */
export function UpdateGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => invoke("updates:status", undefined),
    staleTime: Infinity,
    retry: false,
  });
  useEffect(
    () => window.iris.onEvent("updates:changed", (next) => client.setQueryData(STATUS_KEY, next)),
    [client],
  );
  const action = useMutation({
    mutationFn: (name: "updates:retry" | "updates:install") => invoke(name, undefined),
    onSuccess: (next) => client.setQueryData(STATUS_KEY, next),
    meta: { handlesErrors: true },
  });
  const state = status.data;
  if (state && !state.isRequired && state.phase !== "checking") return children;
  const isChecking = !state || state.phase === "checking";
  const isReady = state?.phase === "ready";
  const isError = state?.phase === "error" || status.isError;
  const isInstalling = state?.phase === "installing";
  return (
    <main className="relative grid min-h-dvh place-items-center p-6">
      <Surface className="flex w-full max-w-lg flex-col gap-5 p-8">
        <Download aria-hidden className="size-8 text-coral" />
        <h1 className="font-serif text-2xl">
          {state?.isRequired ? "Actualización obligatoria" : "Buscando actualizaciones"}
        </h1>
        <p className="text-sm text-ink-2">
          {state?.isRequired
            ? `Iris ${state.nextVersion} está disponible. Debes actualizar para continuar. Tus canciones, Biblias y archivos permanecen en Iris.`
            : "Estamos comprobando si hay una nueva versión de Iris."}
        </p>
        {(state?.message || action.error || status.error) && (
          <Banner tone="error">
            {action.error?.message ??
              state?.message ??
              "No pudimos comprobar el estado de Iris. Vuelve a intentarlo."}
          </Banner>
        )}
        {isChecking && !status.isError && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-2">
            <Spinner className="size-4" />
            Comprobando versión…
          </p>
        )}
        {state?.phase === "downloading" && (
          <div className="flex flex-col gap-2">
            <progress
              aria-label="Descarga de actualización"
              value={state.progress}
              max={100}
              className="h-2 w-full accent-coral"
            />
            <p role="status" className="text-sm text-ink-2">
              Descargando actualización · {Math.floor(state.progress)} %
            </p>
          </div>
        )}
        {isReady && (
          <Button onClick={() => action.mutate("updates:install")} isLoading={action.isPending}>
            Actualizar y reiniciar
          </Button>
        )}
        {isInstalling && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-2">
            <Spinner className="size-4" />
            Preparando el reinicio de Iris…
          </p>
        )}
        {isError && (
          <Button
            variant="secondary"
            icon={<RefreshCw className="size-4" />}
            isLoading={action.isPending}
            onClick={() => {
              if (status.isError) void status.refetch();
              else action.mutate("updates:retry");
            }}
          >
            Reintentar
          </Button>
        )}
      </Surface>
    </main>
  );
}
