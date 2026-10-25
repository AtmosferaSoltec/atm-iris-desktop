import { expect, it } from "vitest";
import { BLACK_FRAME, frameUrls, lyricSizes, rebaseFrame, timerRemaining } from "./projection";

it("keeps countdown and media timestamps consistent across frames", () => {
  expect(timerRemaining({ seconds: 60, running: true, at: 1000 }, 11000)).toBe(50);
  expect(timerRemaining({ seconds: 2, running: true, at: 1000 }, 11000)).toBe(0);
  expect(timerRemaining({ seconds: 60, running: false, at: 1000 }, 11000)).toBe(60);
  const frame = {
    ...BLACK_FRAME,
    content: { kind: "timer" as const, seconds: 60, running: true, at: 1000 },
  };
  expect(rebaseFrame(frame, 500).content).toMatchObject({ at: 1500 });
  expect(rebaseFrame(BLACK_FRAME, 500)).toBe(BLACK_FRAME);
  expect(
    frameUrls({
      ...BLACK_FRAME,
      background: {
        id: "background",
        name: "Fondo",
        colors: [],
        imageUrl: "iris-media://asset/background",
      },
      content: { kind: "image", id: "image", url: "iris-media://asset/image" },
    }),
  ).toEqual(["iris-media://asset/background", "iris-media://asset/image"]);
  expect(lyricSizes({ ...BLACK_FRAME.typography, fontSizePt: 192 }).body).toBe("10cqw");
});
