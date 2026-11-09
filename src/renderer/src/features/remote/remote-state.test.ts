import { describe, expect, it } from "vitest";
import type { ConsoleItem } from "../console/model";
import { buildRemoteState, shouldPublish, type RemoteStateInput } from "./remote-state";

const SONG: ConsoleItem = {
  planItemId: "row-1",
  refId: "song-1",
  kind: "song",
  title: "Grande es tu fidelidad",
  subtitle: "Autor",
  slides: [{ id: "s1", label: "Coro", text: "Grande es tu fidelidad" }],
  file: { id: "asset-1", url: "iris-media://asset/asset-1", durationSeconds: 200 },
  backgroundId: null,
};

function input(overrides: Partial<RemoteStateInput> = {}): RemoteStateInput {
  return {
    churchName: "Iglesia",
    items: [SONG],
    openItem: SONG,
    liveItem: null,
    live: null,
    isCleared: false,
    playback: null,
    volume: 1,
    backgroundId: null,
    backgrounds: [],
    sounds: [],
    countdown: null,
    service: null,
    serviceTypes: [],
    selectedServiceTypeId: null,
    people: [],
    library: [
      {
        kind: "media",
        id: "v1",
        title: "Bienvenida",
        subtitle: "",
        icon: "video",
        durationSeconds: 80,
        previewUrl: "iris-media://asset/v1",
      },
      {
        kind: "song",
        id: "s1",
        title: "Canción",
        subtitle: "",
        icon: "song",
        durationSeconds: null,
        previewUrl: null,
      },
    ],
    bibles: [],
    selectedBible: null,
    now: 10_000,
    ...overrides,
  };
}

describe("buildRemoteState", () => {
  it("never carries a file URL or path", () => {
    const state = buildRemoteState(input());
    expect(JSON.stringify(state)).not.toContain("iris-media");
    expect(state.items[0]).toMatchObject({ id: "row-1", isPlayable: true });
  });

  it("lists only the library's images and videos", () => {
    expect(buildRemoteState(input()).library).toEqual([
      { id: "v1", kind: "video", title: "Bienvenida", durationSeconds: 80 },
    ]);
  });

  it("adds a selected passage that is not in the service", () => {
    const passage: ConsoleItem = { ...SONG, planItemId: "quick:1", kind: "bible", file: null };
    const state = buildRemoteState(input({ openItem: passage }));
    expect(state.items.map((item) => item.id)).toEqual(["row-1", "quick:1"]);
    expect(state.openId).toBe("quick:1");
  });

  it("adds a passage that is on the screens without being open or in the service", () => {
    const passage: ConsoleItem = { ...SONG, planItemId: "bible-live", kind: "bible", file: null };
    const state = buildRemoteState(
      input({ liveItem: passage, live: { key: "bible-live", slide: 0 } }),
    );
    expect(state.items.map((item) => item.id)).toEqual(["row-1", "bible-live"]);
    expect(state.openId).toBe("row-1");
    expect(state.live?.id).toBe("bible-live");
  });

  it("moves the playback position forward to the moment it is built", () => {
    const playback = {
      key: "row-1",
      kind: "track" as const,
      fileId: "asset-1",
      title: "x",
      playing: true,
      position: 10,
      at: 5_000,
      duration: 200,
      loop: false,
    };
    expect(buildRemoteState(input({ playback })).playback?.position).toBe(15);
  });
});

describe("shouldPublish", () => {
  const playing = {
    key: "row-1",
    kind: "track" as const,
    fileId: "asset-1",
    title: "x",
    playing: true,
    position: 0,
    at: 10_000,
    duration: 200,
    loop: false,
  };

  it("skips a playing track that only moved forward", () => {
    const first = buildRemoteState(input({ playback: playing }));
    const later = buildRemoteState(input({ playback: playing, now: 12_000 }));
    expect(shouldPublish({ state: first, at: 10_000 }, later, 12_000)).toBe(false);
  });

  it("publishes a seek", () => {
    const first = buildRemoteState(input({ playback: playing }));
    const jumped = buildRemoteState(
      input({ playback: { ...playing, position: 90, at: 12_000 }, now: 12_000 }),
    );
    expect(shouldPublish({ state: first, at: 10_000 }, jumped, 12_000)).toBe(true);
  });

  it("publishes when the slide on the screens changes", () => {
    const first = buildRemoteState(input());
    const next = buildRemoteState(input({ live: { key: "row-1", slide: 0 } }));
    expect(shouldPublish({ state: first, at: 10_000 }, next, 10_100)).toBe(true);
  });

  it("publishes a new countdown even when the old one was running too", () => {
    const countdown = { kind: "timer" as const, seconds: 300, running: true, at: 10_000 };
    const first = buildRemoteState(input({ countdown }));
    const restarted = buildRemoteState(
      input({ countdown: { ...countdown, seconds: 60, at: 11_000 }, now: 11_000 }),
    );
    expect(shouldPublish({ state: first, at: 10_000 }, restarted, 11_000)).toBe(true);
  });
});
