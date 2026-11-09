import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { Spinner } from "@renderer/components/ui/spinner";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { useRemoteStatus } from "./use-remote-status";

/**
 * "iPad" in the console's tools: opening it turns the remote on (if it was off) and shows the QR
 * the iPad scans to connect. No code, no address: the QR carries both. It is for connecting fast
 * in the middle of a service, so it needs no trip to Settings.
 */
export function RemoteDialog({ onClose }: { onClose: () => void }) {
  const status = useRemoteStatus();
  const [qr, setQr] = useState<string | null>(null);
  const isEnabled = status?.isEnabled;
  const link = status?.pairingLink ?? null;

  useEffect(() => {
    if (isEnabled === false)
      void invoke("remote:set-enabled", true).catch((error) => toast.error(errorMessage(error)));
  }, [isEnabled]);

  useEffect(() => {
    if (!link) return;
    let isCurrent = true;
    // Dark on white with a quiet zone: the camera reads it even from a dim screen.
    QRCode.toDataURL(link, { margin: 2, width: 360, errorCorrectionLevel: "M" }).then(
      (url) => isCurrent && setQr(url),
      (error) => toast.error(errorMessage(error)),
    );
    return () => {
      isCurrent = false;
    };
  }, [link]);

  const count = status?.deviceCount ?? 0;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Control desde iPad"
      description="Abre Iris en el iPad y escanea este código. El iPad y la computadora deben estar en la misma red Wi-Fi."
      size="md"
    >
      <div className="flex flex-col items-center gap-5 pb-6">
        <div className="grid size-[360px] max-w-full place-items-center rounded-lg bg-white">
          {qr && link ? (
            <img src={qr} alt="Código QR para conectar el iPad" className="size-full" />
          ) : (
            <Spinner />
          )}
        </div>
        <p className="text-sm text-ink-2" aria-live="polite">
          {count === 0
            ? "Ningún iPad conectado."
            : count === 1
              ? "1 iPad conectado."
              : `${count} iPads conectados.`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              void invoke("remote:new-link", undefined).catch((error) =>
                toast.error(errorMessage(error)),
              )
            }
          >
            Generar otro QR
          </Button>
          <Button
            variant="secondary"
            disabled={count === 0}
            onClick={() =>
              void invoke("remote:disconnect-all", undefined).catch((error) =>
                toast.error(errorMessage(error)),
              )
            }
          >
            Desconectar iPads
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void invoke("remote:set-enabled", false).then(onClose, (error) =>
                toast.error(errorMessage(error)),
              )
            }
          >
            Apagar el control
          </Button>
        </div>
        {status && status.addresses.length > 0 && (
          <p className="text-xs text-ink-2 select-text">
            Si el iPad no conecta, abre http://{status.addresses[0]}:{status.port} en su navegador:
            debe decir que Iris está activo. Si no abre, el firewall de Windows está bloqueando a
            Iris (elige «Permitir» en redes privadas) o la red aísla los dispositivos.
          </p>
        )}
      </div>
    </Dialog>
  );
}
