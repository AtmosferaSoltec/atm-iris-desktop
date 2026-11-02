import { BrowserWindow, nativeImage } from "electron";
import { THUMBNAIL_WIDTH, type ThumbnailRenderer } from "./thumbnails";

const IDLE_MS = 20_000;
const FRAME_TIMEOUT_MS = 8_000;

/**
 * An image is resized here; a video's frame is drawn by Chromium in a hidden window, the same
 * decoder the screens use: whatever Iris can project gets a picture. The system previews (Quick
 * Look, Explorer) were not used because they answer with a file icon for many videos.
 */
export function createThumbnailRenderer(): ThumbnailRenderer {
  let window: BrowserWindow | null = null;
  let idle: NodeJS.Timeout | undefined;
  // One video at a time: twenty at once would be the load this avoids.
  let queue: Promise<unknown> = Promise.resolve();

  const frameWindow = async (): Promise<BrowserWindow> => {
    clearTimeout(idle);
    if (window && !window.isDestroyed()) return window;
    window = new BrowserWindow({
      show: false,
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_WIDTH,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    await window.loadURL("about:blank");
    return window;
  };

  const chromiumFrame = async (url: string, kind: "image" | "video"): Promise<Buffer | null> => {
    const target = await frameWindow();
    try {
      const dataUrl: unknown = await target.webContents.executeJavaScript(
        `(${drawFrame.toString()})(${JSON.stringify(url)}, ${JSON.stringify(kind)}, ${THUMBNAIL_WIDTH}, ${FRAME_TIMEOUT_MS})`,
      );
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,"))
        return null;
      return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    } finally {
      idle = setTimeout(() => {
        if (window && !window.isDestroyed()) window.destroy();
        window = null;
      }, IDLE_MS);
    }
  };

  return async ({ path, url }, kind) => {
    if (kind === "image") {
      const image = nativeImage.createFromPath(path);
      if (!image.isEmpty()) {
        const scaled =
          image.getSize().width > THUMBNAIL_WIDTH
            ? image.resize({ width: THUMBNAIL_WIDTH, quality: "good" })
            : image;
        return scaled.toJPEG(72);
      }
    }
    // Images nativeImage cannot read (WebP, some PNGs) and every video go through Chromium.
    const next = queue.then(() => chromiumFrame(url, kind));
    queue = next.catch(() => null);
    return next;
  };
}

/**
 * Runs inside the hidden window: an image as it is, or a video's still a third in (at most 1 s), drawn
 * to a canvas and returned as a JPEG.
 */
function drawFrame(
  src: string,
  kind: "image" | "video",
  width: number,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    const draw = (source: CanvasImageSource, sourceWidth: number, sourceHeight: number): string => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(width, sourceWidth);
      canvas.height = Math.max(1, Math.round((canvas.width * sourceHeight) / sourceWidth));
      canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.72);
    };
    if (kind === "image") {
      const image = new Image();
      const timer = setTimeout(() => resolve(null), timeoutMs);
      image.crossOrigin = "anonymous";
      image.onload = () => {
        clearTimeout(timer);
        resolve(image.naturalWidth ? draw(image, image.naturalWidth, image.naturalHeight) : null);
      };
      image.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      image.src = src;
      return;
    }
    const video = document.createElement("video");
    const done = (value: string | null): void => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const at = duration > 0 ? Math.min(1, duration / 3) : 0;
      if (at === 0) video.onseeked?.(new Event("seeked"));
      else video.currentTime = at;
    };
    video.onseeked = () => {
      done(video.videoWidth ? draw(video, video.videoWidth, video.videoHeight) : null);
    };
    video.onerror = () => done(null);
    video.src = src;
  });
}
