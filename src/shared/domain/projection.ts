import type { ProjectionSettings } from "@shared/domain/models";

// What a screen shows at one moment. The console builds it; `/display`, the EN VIVO
// preview and every slide card draw the same value with `ProjectionCanvas`, so they
// always match (IRIS_SPEC §5.12, the same model as the iPad's `ProjectionFrame`).

export type ProjectionBackground = {
  id: string;
  name: string;
  /** Gradient stops ("#2A1658"). Also the placeholder while an image or video loads. */
  colors: string[];
  /** A church image marked as background, filling the screen. */
  imageUrl?: string;
  /** A church video marked as background: muted, looping, filling the screen. */
  videoUrl?: string;
  /** A video background's length, for the picker. */
  durationSeconds?: number | null;
};

export type ProjectionContent =
  | { kind: "blank" }
  | { kind: "text"; text: string; footnote: string | null }
  /** A countdown: `seconds` left at `at` (epoch ms), running down from there or paused; `label` goes above it. */
  | { kind: "timer"; seconds: number; running: boolean; at: number; label?: string }
  | { kind: "image"; id: string; url: string }
  | {
      kind: "video";
      id: string;
      url: string;
      /** Where the video should be: playing from `position` seconds at `at` (epoch ms), or paused there. */
      muted?: boolean;
      volume?: number;
      playing: boolean;
      position: number;
      at: number;
    };

export type ProjectionTypography = Pick<
  ProjectionSettings,
  "fontFamily" | "fontSizePt" | "fontBold" | "fontItalic" | "uppercase"
>;

export type ProjectionFrame = {
  background: ProjectionBackground | null;
  content: ProjectionContent;
  typography: ProjectionTypography;
};

export const DEFAULT_TYPOGRAPHY: ProjectionTypography = {
  fontFamily: "system",
  fontSizePt: 100,
  fontBold: false,
  fontItalic: false,
  uppercase: false,
};

export const BLACK_FRAME: ProjectionFrame = {
  background: null,
  content: { kind: "blank" },
  typography: DEFAULT_TYPOGRAPHY,
};

/**
 * A frame from a console whose clock differs from this screen's: the times in it (when a
 * video started playing) moved by `shiftMs`, so the video plays in step anyway.
 */
export function rebaseFrame(frame: ProjectionFrame, shiftMs: number): ProjectionFrame {
  const { content } = frame;
  if ((content.kind !== "video" && content.kind !== "timer") || !shiftMs) return frame;
  return { ...frame, content: { ...content, at: content.at + shiftMs } };
}

/** Seconds left on a countdown at `now` (epoch ms); never below 0. */
export function timerRemaining(
  timer: { seconds: number; running: boolean; at: number },
  now: number,
): number {
  return timer.running ? Math.max(0, timer.seconds - (now - timer.at) / 1000) : timer.seconds;
}

/** Placeholder stops for a church background while its file loads. */
export const MEDIA_BACKGROUND_COLORS = ["#15151F", "#07070B"];

export { fontStack } from "@shared/domain/projection-font-stack";

/**
 * `fontSizePt` is measured on a 1920-wide screen; as container-query width it scales with
 * whatever size the canvas is drawn at (card, preview or TV). The footnote keeps the
 * iPad's ratio (0.022 of the width against 0.046 for the body).
 */
export function lyricSizes(typography: ProjectionTypography): { body: string; footnote: string } {
  const body = (typography.fontSizePt / 1920) * 100;
  return { body: `${body}cqw`, footnote: `${body * (0.022 / 0.046)}cqw` };
}

/** Every file a frame needs, to preload it before it is shown. */
export function frameUrls(frame: ProjectionFrame): string[] {
  const urls: string[] = [];
  if (frame.background?.imageUrl) urls.push(frame.background.imageUrl);
  if (frame.background?.videoUrl) urls.push(frame.background.videoUrl);
  if (frame.content.kind === "image" || frame.content.kind === "video")
    urls.push(frame.content.url);
  return urls;
}
