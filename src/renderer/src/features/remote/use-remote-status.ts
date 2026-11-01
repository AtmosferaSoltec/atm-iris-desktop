import { useEffect, useState } from "react";
import { errorMessage } from "@shared/errors";
import type { RemoteStatus } from "@shared/remote/protocol";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";

/** The remote control as the main process reports it: asked once, then kept current by events. */
export function useRemoteStatus(): RemoteStatus | null {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  useEffect(() => {
    let isCurrent = true;
    invoke("remote:status", undefined).then(
      (next) => isCurrent && setStatus((current) => current ?? next),
      (error) => toast.error(errorMessage(error)),
    );
    const stop = window.iris.onEvent("remote:changed", setStatus);
    return () => {
      isCurrent = false;
      stop();
    };
  }, []);
  return status;
}
