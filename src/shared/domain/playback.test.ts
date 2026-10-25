import { expect, it } from "vitest";
import { playbackPosition, shouldSeekVideo, ownBackgroundOnPresent } from "./playback";
import { followPlayback } from "./playback";
it("uses the audible YouTube player as clock, learns duration and handles end/repeat", () => {
  const current = {
    fileId: "video",
    kind: "video" as const,
    youTube: true,
    playing: true,
    position: 0,
    at: 1000,
    duration: 0,
    loop: false,
  };
  const report = { id: "video", position: 2, duration: 120 };
  expect(followPlayback(current, report, true, 10000)).toMatchObject({
    position: 2,
    at: 10000,
    duration: 120,
  });
  expect(followPlayback(current, report, false, 10000)).toMatchObject({
    position: 0,
    at: 1000,
    duration: 120,
  });
  expect(followPlayback(current, { ...report, id: "other" }, true, 10000)).toBe(current);
  expect(followPlayback(current, { ...report, position: 120 }, true, 10000)).toBeNull();
  expect(
    followPlayback({ ...current, loop: true }, { ...report, position: 120 }, true, 10000),
  ).toMatchObject({ position: 0, at: 10000 });
});
it("corrects stale video position while leaving small drift alone", () => {
  expect(playbackPosition({ playing: true, position: 5, at: 1000 }, 3000)).toBe(7);
  expect(playbackPosition({ playing: false, position: 5, at: 1000 }, 3000)).toBe(5);
  expect(shouldSeekVideo(5, 5.5)).toBe(false);
  expect(shouldSeekVideo(5, 6)).toBe(true);
});
it("applies a song's own background once without overriding a live operator change", () => {
  expect(ownBackgroundOnPresent("song", null, "own", ["own"])).toBe("own");
  expect(ownBackgroundOnPresent("song", "song", "own", ["own"])).toBeUndefined();
  expect(ownBackgroundOnPresent("other", "song", "missing", ["own"])).toBeUndefined();
});
