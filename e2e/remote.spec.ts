import { expect, test } from "@playwright/test";
import WebSocket from "ws";
import type { RemoteState } from "@shared/remote/protocol";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bibleSampleXml } from "../src/shared/domain/test-fixtures/bible-sample";
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

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=",
  "base64",
);

test("from the iPad: choose the service, set a leader, show library media and a Bible passage", async () => {
  const instance = await launchApp();
  let socket: WebSocket | null = null;
  try {
    await writeFile(join(instance.home, "Images", "anuncio.png"), PNG);
    const xml = join(instance.home, "bible-test.xml");
    await writeFile(xml, bibleSampleXml());
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, xml);
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      await window.iris["media:scan"](undefined);
      await window.iris["bible:import"](undefined);
      const result = await window.iris["service-types:create"]({
        name: "Culto de domingo",
        color: "amber",
        schedule: null,
        blocks: [
          { name: "Bienvenida", plannedMinutes: 5 },
          { name: "Palabra", plannedMinutes: 30 },
        ],
      });
      if (!result.ok) throw new Error(result.error.message);
    });
    await page.reload();
    await expect(page.getByRole("region", { name: "Servicio", exact: true })).toBeVisible();
    const status = await page.evaluate(async () => {
      const result = await window.iris["remote:set-enabled"](true);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    });

    socket = new WebSocket(`ws://127.0.0.1:${status.port}/remote`);
    const received: (Message & {
      id?: string;
      books?: unknown[];
      verses?: unknown[];
      image?: string;
    })[] = [];
    socket.on("message", (data) => received.push(JSON.parse(data.toString())));
    await new Promise<void>((resolve, reject) => {
      socket!.once("open", () => resolve());
      socket!.once("error", reject);
    });
    const send = (command: object): void =>
      socket!.send(JSON.stringify({ type: "command", command }));
    const latest = async (isWanted: (state: RemoteState) => boolean): Promise<RemoteState> => {
      await expect
        .poll(() => received.some((m) => m.state && isWanted(m.state)), { timeout: 5_000 })
        .toBe(true);
      return received.filter((m) => m.state && isWanted(m.state)).at(-1)!.state!;
    };

    socket.send(JSON.stringify({ type: "pair", protocol: 1, code: status.code }));
    const first = await latest(
      (state) => state.serviceTypes.length === 1 && state.bibles.length === 1,
    );
    expect(first.library.map((entry) => entry.kind)).toEqual(["image"]);

    send({ type: "choose-service", id: first.serviceTypes[0]!.id });
    await latest((state) => state.service?.name === "Culto de domingo");
    send({ type: "next-block" });
    await latest((state) => state.service?.phase === "running");
    send({ type: "set-leader", block: 0, name: "Ana Pérez" });
    // Sent right behind a leader that is still being added: neither change may undo the other.
    send({ type: "add-block", name: "Santa cena", minutes: 10, at: 1 });
    const led = await latest((state) => state.service?.blocks[0]?.leader === "Ana Pérez");
    expect(led.people.map((person) => person.name)).toContain("Ana Pérez");
    expect(led.canChooseService).toBe(false);

    // An extra block for this Sunday only: in the record, not in the service.
    const extended = await latest(
      (state) =>
        state.service?.blocks.length === 3 && state.service.blocks[0]?.leader === "Ana Pérez",
    );
    expect(extended.service!.blocks.map((block) => block.name)).toEqual([
      "Bienvenida",
      "Santa cena",
      "Palabra",
    ]);
    await expect(page.getByRole("button", { name: "Siguiente: Santa cena →" })).toBeVisible();
    const types = await page.evaluate(() => window.iris["times:load"](undefined));
    expect(types.ok && types.data.types[0]!.blocks).toHaveLength(2);

    send({ type: "present-media", id: first.library[0]!.id });
    await latest((state) =>
      state.items.some((item) => item.kind === "image" && state.live?.id === item.id),
    );

    socket.send(JSON.stringify({ type: "request", id: "b", request: { kind: "bible-books" } }));
    socket.send(
      JSON.stringify({
        type: "request",
        id: "c",
        request: {
          kind: "bible-chapter",
          translation: first.bibles[0]!.code,
          bookId: "JHN",
          chapter: 3,
        },
      }),
    );
    await expect.poll(() => received.filter((m) => m.type === "response").length).toBe(2);
    expect(received.find((m) => m.id === "b")!.books).toHaveLength(66);
    expect(received.find((m) => m.id === "c")!.verses!.length).toBeGreaterThan(0);

    // The library image's picture, made by the computer and sent as a JPEG.
    socket.send(
      JSON.stringify({
        type: "request",
        id: "t",
        request: { kind: "thumbnail", id: first.library[0]!.id },
      }),
    );
    await expect.poll(() => received.some((m) => m.id === "t")).toBe(true);
    const thumbnail = received.find((m) => m.id === "t") as { image?: string };
    expect(Buffer.from(thumbnail.image!, "base64").subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    );

    send({ type: "countdown", action: "start", seconds: 300, label: "Empezamos en" });
    expect((await latest((state) => state.countdown !== null)).countdown!.label).toBe(
      "Empezamos en",
    );
    send({ type: "countdown", action: "hide" });
    await latest((state) => state.countdown === null);

    send({
      type: "present-bible",
      translation: first.bibles[0]!.code,
      bookId: "JHN",
      chapter: 3,
      from: 16,
      to: 16,
    });
    const passage = await latest((state) =>
      state.items.some((item) => item.kind === "bible" && state.live?.id === item.id),
    );
    await expect(
      page
        .getByRole("region", { name: "Pantalla en vivo", exact: true })
        .getByText("Texto de prueba JHN 3:16", { exact: true }),
    ).toBeVisible();
    // Shown once: neither the passage nor the image joined the service.
    const plan = await page.evaluate(() => window.iris["console:load"](undefined));
    expect(plan.ok && plan.data.items).toEqual([]);
    expect(passage.openId).toBe("bible-live");
  } finally {
    socket?.terminate();
    await instance.close();
  }
});
