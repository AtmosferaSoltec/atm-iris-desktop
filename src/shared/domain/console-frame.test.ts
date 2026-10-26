import { expect, it } from "vitest";
import type { ConsoleItem } from "./console";
import { consoleContent } from "./console-frame";
import { songEntry, mediaEntry } from "./library-entries";

it("builds song, image, video and cleared frames without changing open-item state", () => {
  const item: ConsoleItem = {
    planItemId: "plan",
    refId: "song",
    kind: "song",
    title: "Song",
    subtitle: null,
    slides: [{ id: "slide", label: null, text: "Texto" }],
    file: null,
  };
  expect(consoleContent(item, 0, false, null, null)).toEqual({
    kind: "text",
    text: "Texto",
    footnote: null,
  });
  expect(
    consoleContent(item, 0, true, { kind: "timer", seconds: 30, running: true, at: 1000 }, null),
  ).toEqual({ kind: "blank" });
  const media = {
    ...item,
    file: { id: "file", url: "iris-media://asset/file", durationSeconds: 20 },
  };
  expect(consoleContent({ ...media, kind: "image" }, 0, false, null, null)).toMatchObject({
    kind: "image",
    id: "file",
  });
  expect(
    consoleContent({ ...media, kind: "video" }, 0, false, null, {
      key: "plan",
      playing: true,
      position: 4,
      at: 1000,
    }),
  ).toMatchObject({ kind: "video", playing: true, position: 4, at: 1000 });
});
it("keeps the web's lyrics-only, track-only and combined library icons", () => {
  const song = {
    id: "song",
    title: "Song",
    author: "Autor",
    sectionCount: 2,
    audio: null,
  };
  expect(songEntry(song).icon).toBe("song");
  expect(
    songEntry({
      ...song,
      audio: { id: "audio", durationSeconds: 30 } as NonNullable<
        Parameters<typeof songEntry>[0]["audio"]
      >,
    }).icon,
  ).toBe("songTrack");
  expect(
    songEntry({
      ...song,
      sectionCount: 0,
      audio: { id: "audio", durationSeconds: 30 } as NonNullable<
        Parameters<typeof songEntry>[0]["audio"]
      >,
    }).icon,
  ).toBe("track");
  expect(
    mediaEntry({ id: "image", title: "Imagen", kind: "image", durationSeconds: null } as Parameters<
      typeof mediaEntry
    >[0]).icon,
  ).toBe("image");
});
