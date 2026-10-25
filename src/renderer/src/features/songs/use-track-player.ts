import { useEffect, useRef, useState } from "react";
import { toast } from "@renderer/components/ui/toaster";
import type { MediaAsset } from "@shared/domain/models";
import { assetUrl } from "@renderer/features/media/upload/use-media-upload";

export type PlayState = "idle" | "loading" | "playing";

/**
 * One `<audio>` for the page: playing a song's track stops the one before.
 * Download URLs are asked for only when a track is played.
 */
export function useTrackPlayer(): {
  toggle: (track: Pick<MediaAsset, "id">) => Promise<void>;
  stop: () => void;
  stateOf: (id: string) => PlayState;
} {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<{ id: string; state: PlayState } | null>(null);

  // Leaving the page stops the music.
  useEffect(() => () => audio.current?.pause(), []);

  function element(): HTMLAudioElement {
    if (!audio.current) {
      const created = new Audio();
      created.onended = () => setCurrent(null);
      created.onpause = () =>
        setCurrent((now) => (now?.state === "playing" ? { ...now, state: "idle" } : now));
      audio.current = created;
    }
    return audio.current;
  }

  async function toggle(track: Pick<MediaAsset, "id">): Promise<void> {
    const player = element();
    if (current?.id === track.id && current.state === "playing") {
      player.pause();
      return;
    }
    if (current?.id === track.id && !player.ended && player.src) {
      setCurrent({ id: track.id, state: "playing" });
      await player.play().catch(() => setCurrent(null));
      return;
    }
    player.pause();
    setCurrent({ id: track.id, state: "loading" });
    const url = assetUrl(track.id);
    if (!url) {
      setCurrent(null);
      toast.error("No pudimos reproducir la pista. Inténtalo de nuevo.");
      return;
    }
    player.src = url;
    try {
      await player.play();
      setCurrent({ id: track.id, state: "playing" });
    } catch {
      setCurrent(null);
      toast.error("No pudimos reproducir la pista. Inténtalo de nuevo.");
    }
  }

  /** Stops whatever is playing (e.g. the track was replaced or removed). */
  function stop(): void {
    audio.current?.pause();
    setCurrent(null);
  }

  const stateOf = (id: string): PlayState => (current?.id === id ? current.state : "idle");

  return { toggle, stop, stateOf };
}
