import { PROTOCOL_VERSION } from "./protocol";

/**
 * What the QR on the computer says: where to connect and the one-time secret to pair with. The
 * iPad reads it with its camera, so nobody types a code or an address. `host` repeats because the
 * computer may be on several networks; the iPad uses the first that answers.
 */
export function pairingLink(input: {
  secret: string;
  port: number;
  computerName: string;
  addresses: string[];
}): string {
  const query = new URLSearchParams({
    v: String(PROTOCOL_VERSION),
    c: input.secret,
    p: String(input.port),
    n: input.computerName,
  });
  for (const address of input.addresses) query.append("h", address);
  return `iris://pair?${query.toString()}`;
}
