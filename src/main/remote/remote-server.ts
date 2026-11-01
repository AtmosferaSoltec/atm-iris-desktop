import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { networkInterfaces } from "node:os";
import { WebSocketServer, type WebSocket } from "ws";
import {
  clientMessageSchema,
  PROTOCOL_VERSION,
  type RemoteCommand,
  type RemoteErrorCode,
  type RemoteState,
  type RemoteStatus,
  type ServerMessage,
} from "@shared/remote/protocol";
import { PairingGate } from "./pairing-gate";

const PREFERRED_PORT = 47_831;
/** A connection that says nothing useful for this long is dropped. */
const GREETING_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 15_000;

const MESSAGES: Record<RemoteErrorCode, string> = {
  WRONG_CODE: "Ese código no es correcto.",
  CODE_EXPIRED: "El código venció. Mira el nuevo código en Iris.",
  TOO_MANY_ATTEMPTS: "Demasiados intentos. Mira el nuevo código en Iris.",
  PROTOCOL_MISMATCH: "Esta versión del iPad y la de Iris no son compatibles. Actualiza Iris.",
  BAD_TOKEN: "La conexión ya no es válida. Escribe el código otra vez.",
  BAD_MESSAGE: "No entendimos el mensaje.",
};

type Dependencies = {
  computerName: string;
  /** Makes the computer findable on the network; returns what stops it. */
  advertise: (port: number) => () => void;
  onCommand: (command: RemoteCommand) => void;
  /** The status the console's window shows changed (code, devices, on/off). */
  changed: (status: RemoteStatus) => void;
  gate?: PairingGate;
  port?: number;
  /** For `iris.log`: what to look at when an iPad cannot connect. Never the code or the token. */
  log?: (message: string) => void;
};

/**
 * The remote control's door. Listens on the local network only while the operator has it on;
 * every message is validated, nothing is accepted before pairing, and a browser page can never
 * reach it (it refuses any request that carries an `Origin`).
 */
export class RemoteServer {
  private readonly gate: PairingGate;
  private http: Server | null = null;
  private sockets: WebSocketServer | null = null;
  private stopAdvertising: (() => void) | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private rotation: ReturnType<typeof setTimeout> | null = null;
  private readonly paired = new Set<WebSocket>();
  private readonly isAlive = new WeakMap<WebSocket, boolean>();
  private latest: RemoteState | null = null;

  constructor(private readonly deps: Dependencies) {
    this.gate = deps.gate ?? new PairingGate();
  }

  async start(): Promise<void> {
    if (this.http) return;
    const http = createServer((_request, response) => {
      // Opening this address in the iPad's browser shows whether the computer can be reached at all
      // (a blocked firewall is the usual reason it cannot).
      response
        .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
        .end("Iris: el control desde iPad está activo en esta computadora.");
    });
    const sockets = new WebSocketServer({
      server: http,
      maxPayload: 64 * 1024,
      verifyClient: ({ origin }: { origin: string }) => !origin,
    });
    sockets.on("connection", (socket, request) => {
      this.deps.log?.(`remote: conexión desde ${request.socket.remoteAddress ?? "?"}`);
      this.accept(socket);
    });
    await listen(http, this.deps.port ?? PREFERRED_PORT).catch(() => listen(http, 0));
    this.http = http;
    this.sockets = sockets;
    this.stopAdvertising = this.deps.advertise((http.address() as AddressInfo).port);
    this.heartbeat = setInterval(() => this.ping(), HEARTBEAT_MS);
    this.heartbeat.unref();
    this.gate.rotate();
    this.scheduleRotation();
    this.deps.log?.(`remote: encendido en el puerto ${this.status().port}`);
    this.deps.changed(this.status());
  }

  async stop(): Promise<void> {
    if (!this.http) return;
    const { http, sockets } = this;
    this.http = null;
    this.sockets = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.rotation) clearTimeout(this.rotation);
    this.stopAdvertising?.();
    this.stopAdvertising = null;
    this.say([...this.paired], { type: "bye", reason: "disabled" });
    this.gate.revokeAll();
    this.paired.clear();
    this.latest = null;
    for (const client of sockets?.clients ?? []) client.terminate();
    sockets?.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));
    this.deps.changed(this.status());
  }

  status(): RemoteStatus {
    const isEnabled = this.http !== null;
    const address = this.http?.address();
    return {
      isEnabled,
      code: isEnabled ? this.gate.code : null,
      codeExpiresAt: isEnabled ? new Date(this.gate.expiresAt).toISOString() : null,
      port: isEnabled && address && typeof address === "object" ? address.port : null,
      addresses: isEnabled ? localAddresses() : [],
      deviceCount: this.paired.size,
    };
  }

  newCode(): void {
    if (!this.http) return;
    this.gate.rotate();
    this.scheduleRotation();
    this.deps.changed(this.status());
  }

  /** Every iPad out at once: their tokens stop working and they must pair again. */
  disconnectAll(): void {
    this.gate.revokeAll();
    this.say([...this.paired], { type: "bye", reason: "disconnected" });
    for (const socket of this.paired) socket.close();
    this.paired.clear();
    this.deps.changed(this.status());
  }

  /**
   * The console's newest state: kept for the next iPad and sent to the ones connected. `null` while
   * the console is not on screen, so a paired iPad says so instead of waiting forever.
   */
  publish(state: RemoteState | null): void {
    this.latest = state;
    this.say([...this.paired], { type: "state", state });
  }

  private accept(socket: WebSocket): void {
    this.isAlive.set(socket, true);
    socket.on("pong", () => this.isAlive.set(socket, true));
    const greeting = setTimeout(() => socket.close(), GREETING_TIMEOUT_MS);
    socket.on("close", () => {
      clearTimeout(greeting);
      if (this.paired.delete(socket)) this.deps.changed(this.status());
    });
    socket.on("error", () => socket.terminate());
    socket.on("message", (raw) => {
      const message = parse(raw.toString());
      if (!message) return this.refuse(socket, "BAD_MESSAGE");
      if (message.type === "command") {
        if (this.paired.has(socket)) this.deps.onCommand(message.command);
        else this.refuse(socket, "BAD_TOKEN");
        return;
      }
      if (this.paired.has(socket)) return;
      clearTimeout(greeting);
      if (message.protocol !== PROTOCOL_VERSION) return this.refuse(socket, "PROTOCOL_MISMATCH");
      if (message.type === "resume") {
        if (!this.gate.isValidToken(message.token)) return this.refuse(socket, "BAD_TOKEN");
        return this.welcome(socket, message.token);
      }
      const result = this.gate.attempt(message.code);
      this.scheduleRotation();
      this.deps.log?.(
        `remote: vinculación ${result.ok ? "aceptada" : `rechazada (${result.code})`}`,
      );
      if (!result.ok) {
        this.deps.changed(this.status());
        return this.refuse(socket, result.code);
      }
      this.welcome(socket, result.token);
    });
  }

  private welcome(socket: WebSocket, token: string): void {
    this.paired.add(socket);
    this.say([socket], {
      type: "paired",
      protocol: PROTOCOL_VERSION,
      token,
      computerName: this.deps.computerName,
    });
    this.say([socket], { type: "state", state: this.latest });
    this.deps.changed(this.status());
  }

  private refuse(socket: WebSocket, code: RemoteErrorCode): void {
    this.say([socket], { type: "error", code, message: MESSAGES[code] });
    socket.close();
  }

  private say(targets: WebSocket[], message: ServerMessage): void {
    const text = JSON.stringify(message);
    for (const socket of targets) if (socket.readyState === socket.OPEN) socket.send(text);
  }

  private ping(): void {
    for (const socket of this.paired) {
      // No answer to the last ping: the iPad left without saying goodbye.
      if (!this.isAlive.get(socket)) {
        socket.terminate();
        continue;
      }
      this.isAlive.set(socket, false);
      socket.ping();
    }
  }

  /** The code shown on the console is always a live one. */
  private scheduleRotation(): void {
    if (this.rotation) clearTimeout(this.rotation);
    this.rotation = setTimeout(
      () => {
        if (!this.http) return;
        this.gate.rotate();
        this.scheduleRotation();
        this.deps.changed(this.status());
      },
      Math.max(1_000, this.gate.expiresAt - Date.now()),
    );
    this.rotation.unref();
  }
}

function parse(text: string): ReturnType<typeof clientMessageSchema.parse> | null {
  try {
    const result = clientMessageSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = (error: Error): void => reject(error);
    server.once("error", fail);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", fail);
      resolve();
    });
  });
}

function localAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry?.family === "IPv4" && !entry.internal)
    .map((entry) => entry!.address);
}
