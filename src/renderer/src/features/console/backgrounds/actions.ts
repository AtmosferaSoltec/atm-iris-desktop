import type { ProjectionBackground } from "@shared/domain/projection";
import { MEDIA_BACKGROUND_COLORS } from "@shared/domain/projection";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";

export async function backgroundFor(
  id: string,
): Promise<{ background?: ProjectionBackground; error?: string }> {
  try {
    const asset = await invoke("media:get", id);
    if (asset.isMissing || !asset.isBackground || asset.needsMeasures)
      return { error: "No pudimos mostrar el fondo." };
    return {
      background: {
        id,
        name: asset.title,
        colors: MEDIA_BACKGROUND_COLORS,
        ...(asset.kind === "video"
          ? { videoUrl: `iris-media://asset/${id}`, durationSeconds: asset.durationSeconds }
          : { imageUrl: `iris-media://asset/${id}` }),
      },
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function setSongBackground(
  id: string,
  backgroundId: string | null,
): Promise<{ error?: string }> {
  try {
    const song = await invoke("songs:get", id);
    await invoke("songs:update", {
      id,
      input: {
        title: song.title,
        author: song.author,
        sections: song.sections,
        audioId: song.audio?.id ?? null,
        backgroundId,
      },
    });
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
