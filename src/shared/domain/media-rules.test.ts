import { describe, expect, it } from "vitest";
import { backgroundProblem, mediaSection } from "./media-rules";

const image = {
  kind: "image" as const,
  contentType: "image/png",
  sizeBytes: 2_000_000,
  width: 1920,
  height: 1080,
  durationSeconds: null,
};
const video = {
  kind: "video" as const,
  contentType: "video/mp4",
  sizeBytes: 20_000_000,
  width: 1920,
  height: 1080,
  durationSeconds: 20,
};

describe("backgroundProblem", () => {
  it("takes any size and shape: the background is cropped to fill", () => {
    expect(backgroundProblem(image)).toBeNull();
    expect(backgroundProblem({ ...image, width: 640, height: 640 })).toBeNull();
    expect(backgroundProblem({ ...video, width: 1080, height: 1920 })).toBeNull();
    expect(backgroundProblem({ ...video, contentType: "video/quicktime" })).toBeNull();
  });

  it("rejects audio, other types and heavy files", () => {
    expect(backgroundProblem({ ...image, kind: "audio" })).toMatch(/audio/i);
    expect(backgroundProblem({ ...image, contentType: "image/gif" })).toMatch(/JPG/);
    expect(backgroundProblem({ ...image, sizeBytes: 16 * 1024 * 1024 })).toMatch(/15 MB/);
    expect(backgroundProblem({ ...video, sizeBytes: 201 * 1024 * 1024 })).toMatch(/200 MB/);
  });

  it("limits videos to 30 seconds", () => {
    expect(backgroundProblem({ ...video, durationSeconds: 30.03 })).toBeNull();
    expect(backgroundProblem({ ...video, durationSeconds: 31 })).toMatch(/30 segundos/);
    expect(backgroundProblem({ ...video, durationSeconds: null })).toMatch(/medir/);
  });
});
describe("mediaSection", () => {
  it("puts audio with the songs (tracks), backgrounds in Fondos and the rest in Multimedia", () => {
    expect(mediaSection({ kind: "audio", isBackground: false })).toBe("music");
    expect(mediaSection({ kind: "image", isBackground: true })).toBe("backgrounds");
    expect(mediaSection({ kind: "video", isBackground: false })).toBe("media");
  });
});
