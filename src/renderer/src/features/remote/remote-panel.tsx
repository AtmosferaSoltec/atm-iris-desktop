import { useState } from "react";
import { Button } from "@renderer/components/ui/button";
import { Panel } from "@renderer/components/ui/panel";
import { Spinner } from "@renderer/components/ui/spinner";
import { Switch } from "@renderer/components/ui/switch";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { useRemoteStatus } from "./use-remote-status";

/** "Control desde iPad": turns the remote on and shows the code the iPad asks for. */
export function RemotePanel() {
  const status = useRemoteStatus();
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Panel
      title="Control desde iPad"
      description="Maneja la proyección desde un iPad conectado a la misma red Wi-Fi."
      accessory={
        status ? (
          <Switch
            label="Permitir el control desde iPad"
            checked={status.isEnabled}
            disabled={isBusy}
            onCheckedChange={(isEnabled) => run(() => invoke("remote:set-enabled", isEnabled))}
          />
        ) : undefined
      }
    >
      {!status ? (
        <Spinner />
      ) : !status.isEnabled ? (
        <p className="text-sm text-ink-2">
          Está apagado. Enciéndelo para que el iPad pueda conectarse. La primera vez, Windows pedirá
          permiso en el firewall: elige «Permitir» en redes privadas.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-ink-2">Escribe este código en el iPad:</p>
            <p
              className="mt-2 font-serif text-5xl tracking-[0.18em] tabular-nums"
              aria-label={`Código ${status.code?.split("").join(" ")}`}
            >
              {status.code?.slice(0, 3)} {status.code?.slice(3)}
            </p>
            <p className="mt-2 text-xs text-ink-2">
              Sirve una sola vez y cambia solo después de unos minutos.
            </p>
          </div>
          <p className="text-sm text-ink-2" aria-live="polite">
            {status.deviceCount === 0
              ? "Ningún iPad conectado."
              : status.deviceCount === 1
                ? "1 iPad conectado."
                : `${status.deviceCount} iPads conectados.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={isBusy}
              onClick={() => run(() => invoke("remote:new-code", undefined))}
            >
              Generar otro código
            </Button>
            <Button
              variant="secondary"
              disabled={isBusy || status.deviceCount === 0}
              onClick={() => run(() => invoke("remote:disconnect-all", undefined))}
            >
              Desconectar iPads
            </Button>
          </div>
          {status.addresses.length > 0 && (
            <p className="text-xs text-ink-2">
              Si el iPad no encuentra esta computadora, escribe su dirección en el iPad:{" "}
              {status.addresses
                .slice(0, 3)
                .map((address) => `${address}:${status.port}`)
                .join(" · ")}
              . Para comprobar la conexión, abre{" "}
              <span className="font-medium">
                http://{status.addresses[0]}:{status.port}
              </span>{" "}
              en el navegador del iPad: debe decir que Iris está activo. Si no abre, el firewall de
              Windows está bloqueando a Iris.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
