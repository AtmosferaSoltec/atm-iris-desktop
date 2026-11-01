import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@renderer/components/ui/button";
import { TextField } from "@renderer/components/ui/text-field";
import { youTubeThumbnail, youTubeVideoId } from "@shared/lib/youtube";

/**
 * Paste a YouTube link and put the video on the screens. It is not saved anywhere: YouTube's own
 * player plays it (with its sound, from the projection window) and it needs internet.
 */
export function YouTubePanel({ onPlay }: { onPlay: (videoId: string) => void }) {
  const [link, setLink] = useState("");
  const videoId = youTubeVideoId(link);

  return (
    <form
      className="flex flex-col gap-4 px-1 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (videoId) onPlay(videoId);
      }}
    >
      <TextField
        id="youtube-link"
        density="sm"
        label="Enlace de YouTube"
        placeholder="https://www.youtube.com/watch?v=…"
        value={link}
        onChange={(event) => setLink(event.target.value)}
        error={link.trim() && !videoId ? "Ese enlace no es de un video de YouTube." : undefined}
      />
      {videoId && (
        <div className="overflow-hidden rounded-md ring-1 ring-line">
          <img
            src={youTubeThumbnail(videoId)}
            alt="Vista previa del video"
            className="aspect-video w-full object-cover"
            draggable={false}
          />
        </div>
      )}
      <Button type="submit" icon={<Play className="size-4" />} disabled={!videoId}>
        Proyectar video
      </Button>
      <p className="text-xs text-ink-2">
        El video se reproduce con YouTube en la pantalla de proyección y suena desde ahí. Necesita
        internet y puede mostrar anuncios. No se guarda en el servicio.
      </p>
    </form>
  );
}
