import { describe, expect, it, vi } from "vitest";
import { lookUpYouTube } from "./youtube-oembed";

describe("YouTube oEmbed", () => {
  it("uses the public endpoint with a timeout and resolves metadata", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ title: "Pista", author_name: "Autor" }), { status: 200 }),
      );
    expect(await lookUpYouTube("dQw4w9WgXcQ", request)).toEqual({
      video: { videoId: "dQw4w9WgXcQ", title: "Pista", author: "Autor" },
    });
    expect(request.mock.calls[0][0]).toContain("https://www.youtube.com/oembed?");
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("distinguishes forbidden videos and offline or aborted requests", async () => {
    for (const status of [401, 403])
      expect(
        await lookUpYouTube(
          "dQw4w9WgXcQ",
          vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status })),
        ),
      ).toMatchObject({ error: "Este video no permite reproducirse fuera de YouTube." });
    for (const error of [new TypeError("offline"), new DOMException("timeout", "TimeoutError")])
      expect(
        await lookUpYouTube("dQw4w9WgXcQ", vi.fn<typeof fetch>().mockRejectedValue(error)),
      ).toMatchObject({ isOffline: true });
  });
});
