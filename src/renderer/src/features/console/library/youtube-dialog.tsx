import { Link2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextField } from "@renderer/components/ui/text-field";
import type { LibraryEntry } from "../model";
import { saveYouTubeVideo } from "./actions";
import { youTubeThumbnail, youTubeVideoId } from "@shared/lib/youtube";

/**
 * "Agregar enlace de YouTube": paste a link, see what it is, save it in the library. It plays in
 * YouTube's own player on the screens (with sound from the console); nothing is downloaded.
 */
export function YouTubeDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (entry: LibraryEntry) => void;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const videoId = youTubeVideoId(link);

  function save() {
    setError(null);
    startLoad(async () => {
      const result = await saveYouTubeVideo(link);
      if (result.entry) onSaved(result.entry);
      else setError(result.error ?? "No pudimos guardar el video.");
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Video de YouTube"
      description="Pega el enlace. Se reproduce en la pantalla con el reproductor de YouTube y el sonido sale de la pantalla de proyección. Necesita internet."
      size="md"
    >
      <form
        className="flex flex-col gap-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (videoId) save();
        }}
      >
        {error && <Banner tone="error">{error}</Banner>}
        <TextField
          id="youtube-link"
          label="Enlace"
          placeholder="https://www.youtube.com/watch?v=…"
          icon={<Link2 />}
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError(null);
          }}
          error={link.trim() && !videoId ? "Ese enlace no es de un video de YouTube." : undefined}
          autoFocus
        />
        {videoId && (
          // YouTube supplies the thumbnail.
          <img
            src={youTubeThumbnail(videoId)}
            alt=""
            className="aspect-video w-full rounded-md object-cover ring-1 ring-line"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!videoId} isLoading={isLoading}>
            Guardar en la biblioteca
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
