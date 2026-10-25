import type { YouTubeVideo } from "@shared/lib/youtube";
import { z } from "@shared/zod";

export type YouTubeCheck = { video?: YouTubeVideo; error?: string; isOffline?: boolean };
export async function lookUpYouTube(
  videoId: string,
  request: typeof fetch = fetch,
): Promise<YouTubeCheck> {
  try {
    const watch = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await request(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (response.status === 401 || response.status === 403)
      return { error: "Este video no permite reproducirse fuera de YouTube." };
    if (!response.ok) return { error: "No encontramos ese video. Revisa el enlace." };
    const data = z
      .object({ title: z.string().optional(), author_name: z.string().optional() })
      .parse(await response.json());
    return {
      video: { videoId, title: data.title ?? "Video de YouTube", author: data.author_name ?? "" },
    };
  } catch {
    return {
      error: "No pudimos consultar YouTube. Revisa la conexión a internet.",
      isOffline: true,
    };
  }
}
