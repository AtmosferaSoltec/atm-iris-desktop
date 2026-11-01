import type { IpcHandlers } from "./dispatch";
import type { RemoteServer } from "../remote/remote-server";

export function remoteHandlers(
  server: RemoteServer,
  /** Remembers whether the operator left the remote control on. */
  remember: (isEnabled: boolean) => void,
): Pick<
  IpcHandlers,
  | "remote:status"
  | "remote:set-enabled"
  | "remote:new-code"
  | "remote:disconnect-all"
  | "remote:publish-state"
> {
  return {
    "remote:status": () => server.status(),
    "remote:set-enabled": async (isEnabled) => {
      if (isEnabled) await server.start();
      else await server.stop();
      remember(isEnabled);
      return server.status();
    },
    "remote:new-code": () => {
      server.newCode();
      return server.status();
    },
    "remote:disconnect-all": () => {
      server.disconnectAll();
      return server.status();
    },
    "remote:publish-state": (state) => {
      if (server.status().isEnabled) server.publish(state);
    },
  };
}
