import type { ConsoleItem } from "./console";
import type { ProjectionContent } from "./projection";

export type FramePlayback = {
  key: string;
  playing: boolean;
  position: number;
  at: number;
  captions: boolean | null;
};
export function consoleContent(
  item: ConsoleItem | null,
  slide: number,
  isCleared: boolean,
  timer: Extract<ProjectionContent, { kind: "timer" }> | null,
  playback: FramePlayback | null,
): ProjectionContent {
  if (isCleared) return { kind: "blank" };
  if (timer) return timer;
  if (!item) return { kind: "blank" };
  if (item.kind === "song") {
    const content = item.slides[slide];
    return content
      ? { kind: "text", text: content.text, footnote: content.footnote ?? null }
      : { kind: "blank" };
  }
  if (item.kind === "image" && item.file)
    return { kind: "image", id: item.file.id, url: item.file.url };
  const state = playback?.key === item.planItemId ? playback : null;
  if (item.kind === "video" && item.file)
    return {
      kind: "video",
      id: item.file.id,
      url: item.file.url,
      playing: state?.playing ?? false,
      position: state?.position ?? 0,
      at: state?.at ?? 0,
    };
  if (item.kind === "youtube" && item.youTubeId)
    return {
      kind: "youtube",
      id: item.youTubeId,
      playing: state?.playing ?? false,
      position: state?.position ?? 0,
      at: state?.at ?? 0,
      captions: state?.captions ?? false,
    };
  return { kind: "blank" };
}
