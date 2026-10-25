// YouTube's IFrame Player API, loaded once per page. The video plays in YouTube's own
// player (their terms allow embedding, not downloading).

export type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  /** Undocumented but stable: "captions" is the subtitles module. */
  loadModule(name: string): void;
  unloadModule(name: string): void;
  destroy(): void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onError?: (event: { data: number }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeNamespace> | null = null;

export function loadYouTube(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    const timeout = setTimeout(() => {
      loading = null;
      reject(new Error("Sin conexión. Los videos de YouTube necesitan internet."));
    }, 10000);
    script.onerror = () => {
      clearTimeout(timeout);
      loading = null;
      reject(new Error("Sin conexión. Los videos de YouTube necesitan internet."));
    };
    const ready = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      ready?.();
    };
    document.head.append(script);
  });
  return loading;
}

/** 101 and 150: the owner does not allow playing it outside YouTube. */
export const isEmbedBlocked = (code: number): boolean => code === 101 || code === 150;
