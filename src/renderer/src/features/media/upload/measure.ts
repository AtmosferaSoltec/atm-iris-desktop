import type { MediaKind } from "@shared/domain/models";

export type MediaMeasures = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
};
const NONE: MediaMeasures = { durationSeconds: null, width: null, height: null };
const METADATA_TIMEOUT_MS = 15_000;

export function measureMediaUrl(url: string, kind: MediaKind): Promise<MediaMeasures> {
  return new Promise((resolve) => {
    let isFinished = false;
    const element = kind === "image" ? new Image() : document.createElement(kind);
    const finish = (result: MediaMeasures): void => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);
      element.onload = null;
      element.onerror = null;
      if (element instanceof HTMLMediaElement) {
        element.onloadedmetadata = null;
        element.removeAttribute("src");
        element.load();
      }
      resolve(result);
    };
    const timer = setTimeout(() => finish(NONE), METADATA_TIMEOUT_MS);
    element.onerror = () => finish(NONE);
    if (element instanceof HTMLImageElement)
      element.onload = () =>
        finish({
          durationSeconds: null,
          width: element.naturalWidth,
          height: element.naturalHeight,
        });
    else {
      element.preload = "metadata";
      element.muted = true;
      element.onloadedmetadata = () =>
        finish({
          durationSeconds: Number.isFinite(element.duration) ? element.duration : null,
          width: element instanceof HTMLVideoElement ? element.videoWidth || null : null,
          height: element instanceof HTMLVideoElement ? element.videoHeight || null : null,
        });
    }
    element.src = url;
  });
}
