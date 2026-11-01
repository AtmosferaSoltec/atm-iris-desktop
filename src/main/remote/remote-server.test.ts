import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { PROTOCOL_VERSION, type RemoteState, type RemoteStatus } from "@shared/remote/protocol";
import { PairingGate } from "./pairing-gate";
import { RemoteServer } from "./remote-server";

const STATE: RemoteState = {
  churchName: "Iglesia",
  items: [],
  openId: null,
  live: null,
  isCleared: false,
  playback: null,
  volume: 1,
  backgroundId: null,
  backgrounds: [],
  sounds: [],
  countdown: null,
  service: null,
};

let server: RemoteServer | null = null;
afterEach(async () => {
  await server?.stop();
  server = null;
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Test helper: the inferred type is what the tests use.
async function start(commands: unknown[] = [], statuses: RemoteStatus[] = []) {
  server = new RemoteServer({
    computerName: "PC",
    advertise: () => () => {},
    onCommand: (command) => commands.push(command),
    changed: (status) => statuses.push(status),
    gate: new PairingGate({ newCode: () => "123456", newToken: () => "token-1" }),
    port: 0,
  });
  await server.start();
  return `ws://127.0.0.1:${server.status().port}/remote`;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Test helper: the inferred type is what the tests use.
function connect(url: string, headers?: Record<string, string>) {
  const socket = new WebSocket(url, { headers });
  const received: Record<string, unknown>[] = [];
  const closed = new Promise<void>((resolve) => socket.on("close", () => resolve()));
  socket.on("message", (data) => received.push(JSON.parse(data.toString())));
  const opened = new Promise<void>((resolve, reject) => {
    socket.on("open", () => resolve());
    socket.on("error", reject);
  });
  const waitFor = async (count: number): Promise<void> => {
    for (let i = 0; i < 100 && received.length < count; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
  };
  return { socket, received, closed, opened, waitFor };
}

const pair = (code: string): string =>
  JSON.stringify({ type: "pair", protocol: PROTOCOL_VERSION, code });

describe("RemoteServer", () => {
  it("pairs with the code, sends the latest state and relays commands", async () => {
    const commands: unknown[] = [];
    const url = await start(commands);
    server!.publish(STATE);
    const client = connect(url);
    await client.opened;
    client.socket.send(pair("123456"));
    await client.waitFor(2);
    expect(client.received[0]).toMatchObject({
      type: "paired",
      token: "token-1",
      computerName: "PC",
    });
    expect(client.received[1]).toMatchObject({ type: "state", state: { churchName: "Iglesia" } });
    expect(server!.status().deviceCount).toBe(1);

    client.socket.send(
      JSON.stringify({ type: "command", command: { type: "set-cleared", value: true } }),
    );
    client.socket.send(JSON.stringify({ type: "command", command: { type: "delete-everything" } }));
    await client.waitFor(3);
    expect(commands).toEqual([{ type: "set-cleared", value: true }]);
    expect(client.received[2]).toMatchObject({ type: "error", code: "BAD_MESSAGE" });
  });

  it("tells a paired iPad when the console is not on screen", async () => {
    const url = await start();
    const client = connect(url);
    await client.opened;
    client.socket.send(pair("123456"));
    await client.waitFor(2);
    expect(client.received[1]).toEqual({ type: "state", state: null });
    server!.publish(STATE);
    server!.publish(null);
    await client.waitFor(4);
    expect(client.received[2]).toMatchObject({ type: "state", state: { churchName: "Iglesia" } });
    expect(client.received[3]).toEqual({ type: "state", state: null });
  });

  it("refuses a wrong code and a command before pairing", async () => {
    const commands: unknown[] = [];
    const url = await start(commands);
    const wrong = connect(url);
    await wrong.opened;
    wrong.socket.send(pair("000000"));
    await wrong.closed;
    expect(wrong.received[0]).toMatchObject({ type: "error", code: "WRONG_CODE" });

    const early = connect(url);
    await early.opened;
    early.socket.send(JSON.stringify({ type: "command", command: { type: "next-block" } }));
    await early.closed;
    expect(commands).toEqual([]);
  });

  it("refuses another protocol version", async () => {
    const url = await start();
    const client = connect(url);
    await client.opened;
    client.socket.send(JSON.stringify({ type: "pair", protocol: 99, code: "123456" }));
    await client.closed;
    expect(client.received[0]).toMatchObject({ type: "error", code: "PROTOCOL_MISMATCH" });
  });

  it("resumes with the token and stops answering to it after disconnecting everyone", async () => {
    const url = await start();
    const first = connect(url);
    await first.opened;
    first.socket.send(pair("123456"));
    await first.waitFor(1);
    first.socket.close();
    await first.closed;

    const again = connect(url);
    await again.opened;
    again.socket.send(
      JSON.stringify({ type: "resume", protocol: PROTOCOL_VERSION, token: "token-1" }),
    );
    await again.waitFor(1);
    expect(again.received[0]).toMatchObject({ type: "paired" });

    server!.disconnectAll();
    await again.closed;
    const late = connect(url);
    await late.opened;
    late.socket.send(
      JSON.stringify({ type: "resume", protocol: PROTOCOL_VERSION, token: "token-1" }),
    );
    await late.closed;
    expect(late.received[0]).toMatchObject({ type: "error", code: "BAD_TOKEN" });
  });

  it("rejects connections that come from a web page", async () => {
    const url = await start();
    const client = connect(url, { Origin: "https://evil.example" });
    await expect(client.opened).rejects.toThrow();
  });

  it("is closed to everyone once stopped", async () => {
    const url = await start();
    await server!.stop();
    expect(server!.status().isEnabled).toBe(false);
    await expect(connect(url).opened).rejects.toThrow();
  });
});
