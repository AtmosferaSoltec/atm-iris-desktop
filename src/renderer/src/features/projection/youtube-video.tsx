import { useEffect, useRef, useState } from "react";
import type { ProjectionContent } from "@shared/domain/projection";
import { youtubeMessageSchema } from "@shared/schemas/youtube-player";

export function YouTubeVideo({
  content,
  audible,
  onVideoTime,
  onVideoError,
}: {
  content: Extract<ProjectionContent, { kind: "youtube" }>;
  audible: boolean;
  onVideoTime?: (time: { id: string; position: number; duration: number }) => void;
  onVideoError?: (message: string) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const receive = (event: MessageEvent): void => {
      if (event.source !== iframe.current?.contentWindow) return;
      const result = youtubeMessageSchema.safeParse(event.data);
      if (!result.success) return;
      if (result.data.type === "iris-youtube:ready") setIsReady(true);
      else if (result.data.type === "iris-youtube:time") onVideoTime?.(result.data);
      else {
        setError(result.data.message);
        onVideoError?.(result.data.message);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onVideoTime, onVideoError]);
  useEffect(() => {
    if (isReady)
      iframe.current?.contentWindow?.postMessage(
        { type: "iris-youtube:command", ...content, audible: audible && !content.muted },
        "*",
      );
  }, [content, audible, isReady]);
  return (
    <div className="absolute inset-0 bg-black">
      <iframe
        ref={iframe}
        src="iris-player://app/youtube-player.html"
        title="Reproductor de YouTube"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="autoplay; encrypted-media"
        className="size-full border-0"
      />
      {error && (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-0 bg-black p-4 text-center text-sm text-white"
        >
          {error}
        </p>
      )}
    </div>
  );
}
