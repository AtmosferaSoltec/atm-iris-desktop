import { expect, test } from "@playwright/test";
import WebSocket from "ws";
import type { RemoteState } from "@shared/remote/protocol";
import { launchApp } from "./helpers";

type Message = { type: string; state?: RemoteState; code?: string };

test("an iPad pairs with the code, sees the service and drives the console", async () => {
  const instance = await launchApp();
  let socket: WebSocket | null = null;
  try {
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      const song = await window.iris["songs:create"]({
        title: "Remota",
        author: "Autor",
        sections: [
          { label: "Estrofa", text: "Primera letra" },
          { label: "Coro", text: "Segunda letra" },
        ],
        audioId: null,
      });
      if (!song.ok) throw new Error(song.error.message);
      await window.iris["plan:add"]({ kind: "song", refId: song.data.song.id });
    });
    await page.reload();
    await expect(page.getByRole("region", { name: "Servicio", exact: true })).toBeVisible();

    const status = await page.evaluate(async () => {
      const result = await window.iris["remote:set-enabled"](true);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    });
    expect(status.isEnabled).toBe(true);
    expect(status.code).toMatch(/^\d{6}$/);

    socket = new WebSocket(`ws://127.0.0.1:${status.port}/remote`);
    const received: Message[] = [];
    socket.on("message", (data) => received.push(JSON.parse(data.toString()) as Message));
    await new Promise<void>((resolve, reject) => {
      socket!.once("open", () => resolve());
      socket!.once("error", reject);
    });
    const latest = async (isWanted: (state: RemoteState) => boolean): Promise<RemoteState> => {
      await expect
        .poll(() => received.some((m) => m.state && isWanted(m.state)), { timeout: 5_000 })
        .toBe(true);
      return received.filter((m) => m.state && isWanted(m.state)).at(-1)!.state!;
    };

    socket.send(JSON.stringify({ type: "pair", protocol: 1, code: status.code }));
    const first = await latest((state) => state.items.length === 1);
    expect(received[0]!.type).toBe("paired");
    expect(first.items[0]!.slides.map((slide) => slide.text)).toEqual([
      "Primera letra",
      "Segunda letra",
    ]);
    expect(JSON.stringify(first)).not.toContain("iris-media");

    const id = first.items[0]!.id;
    socket.send(JSON.stringify({ type: "command", command: { type: "show-slide", id, slide: 1 } }));
    const shown = await latest((state) => state.live?.slide === 1);
    expect(shown.live).toEqual({ id, slide: 1 });
    await expect(page.getByText("Segunda letra").first()).toBeVisible();

    socket.send(JSON.stringify({ type: "command", command: { type: "set-cleared", value: true } }));
    expect((await latest((state) => state.isCleared)).isCleared).toBe(true);

    const off = await page.evaluate(() => window.iris["remote:set-enabled"](false));
    expect(off.ok && off.data.isEnabled).toBe(false);
  } finally {
    socket?.terminate();
    await instance.close();
  }
});
