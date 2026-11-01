import { Bonjour } from "bonjour-service";
import { PROTOCOL_VERSION, REMOTE_SERVICE_TYPE } from "@shared/remote/protocol";

/**
 * Announces this computer on the local network (`_iris._tcp`) so the iPad finds it without
 * anyone typing an address. Returns the function that withdraws the announcement.
 */
export function advertiseOnNetwork(name: string): (port: number) => () => void {
  return (port) => {
    const bonjour = new Bonjour();
    bonjour.publish({
      name,
      type: REMOTE_SERVICE_TYPE,
      protocol: "tcp",
      port,
      txt: { v: String(PROTOCOL_VERSION) },
    });
    return () => {
      bonjour.unpublishAll(() => bonjour.destroy());
    };
  };
}
