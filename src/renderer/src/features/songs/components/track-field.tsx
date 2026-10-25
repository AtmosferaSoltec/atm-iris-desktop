import { youTubeThumbnail } from "@shared/lib/youtube";
import { Link2, Pause, Play, RotateCw, X } from "lucide-react";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import { SECTION_KINDS } from "@shared/domain/media-rules";
import type { MediaAsset } from "@shared/domain/models";
import { acceptedTypes, fileFacts } from "@renderer/features/media/media-format";
import { useMediaUpload } from "@renderer/features/media/upload/use-media-upload";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { youTubeVideoId, type YouTubeVideo } from "@shared/lib/youtube";
import { findYouTubeTrack } from "../actions";
import { useTrackPlayer } from "../use-track-player";
import { YouTubeBadge } from "./youtube-badge";

import { IMPORT_STATUS_TEXT as STATUS_TEXT } from "@renderer/features/media/messages";

/** The song's track: an uploaded file or a YouTube (Music) video, never both (contract §10). */
export type Track = { kind: "audio"; audio: MediaAsset } | { kind: "youtube"; video: YouTubeVideo };

type Props = {
  track: Track | null;
  onChange: (track: Track | null) => void;
  error?: string;
};

/**
 * The song's track (contract §10). Mainly a YouTube video, pasted as a
 * link: it plays in YouTube's player and takes no space. An uploaded file is the
 * fallback for a church without internet. An upload goes up right away and stays with the song
 * when it is saved; a replaced or removed one is deleted by the API on save, and one never
 * saved is cleaned up a day later.
 */
export function TrackField({ track, onChange, error }: Props) {
  const player = useTrackPlayer();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const upload = useMediaUpload("track", {
    onUploaded: (asset) => {
      player.stop();
      onChange({ kind: "audio", audio: asset });
      toast.success("Pista lista. Guarda la canción para conservarla.");
    },
  });
  const item = upload.items.at(-1);
  const isUploading = upload.isImporting;
  const audio = track?.kind === "audio" ? track.audio : null;

  function choose(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    for (const previous of upload.items) upload.onDismiss(previous.id);
    void upload.importFiles([file]);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) choose(event.dataTransfer.files);
  }

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept={acceptedTypes(SECTION_KINDS.music)}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        choose(event.target.files);
        event.target.value = "";
      }}
    />
  );

  return (
    <Field id="track" label="Pista" error={error}>
      <input type="hidden" name="audioId" value={audio?.id ?? ""} />
      <input
        type="hidden"
        name="youtubeId"
        value={track?.kind === "youtube" ? track.video.videoId : ""}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "rounded-md border border-line bg-surface transition-colors",
          isDragging && "border-coral",
          error && "border-danger/80",
        )}
      >
        {isUploading ? (
          <div className="flex items-center gap-3 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-success/14 text-success">
              <Spinner className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item?.title ?? "Pista"}</p>
              <p className="text-xs text-ink-2">
                {item ? STATUS_TEXT[item.status] : "Preparando…"}
              </p>
            </div>
          </div>
        ) : track?.kind === "youtube" ? (
          <YouTubeTrackCard video={track.video} onRemove={() => onChange(null)} />
        ) : audio ? (
          <div className="flex items-center gap-3 p-3">
            <IconButton
              label={
                player.stateOf(audio.id) === "playing" ? "Pausar la pista" : "Escuchar la pista"
              }
              isActive={player.stateOf(audio.id) === "playing"}
              disabled={player.stateOf(audio.id) === "loading"}
              onClick={() => void player.toggle(audio)}
              className="text-success"
            >
              {player.stateOf(audio.id) === "loading" ? (
                <Spinner className="size-4" />
              ) : player.stateOf(audio.id) === "playing" ? (
                <Pause />
              ) : (
                <Play />
              )}
            </IconButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{audio.fileName}</p>
              <p className="truncate text-xs text-ink-2">
                {fileFacts(audio)}
                {audio.durationSeconds !== null && ` · ${clock(audio.durationSeconds)}`}
              </p>
            </div>
            <IconButton
              label="Quitar la pista"
              onClick={() => {
                player.stop();
                onChange(null);
              }}
            >
              <X />
            </IconButton>
          </div>
        ) : (
          <YouTubePicker
            onPick={(video) => onChange({ kind: "youtube", video })}
            onUpload={() => fileInput.current?.click()}
          />
        )}
      </div>
      {item?.status === "error" && (
        <p role="alert" className="flex items-center gap-2 text-xs font-medium text-danger">
          {item.error}
          {item.canRetry && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCw className="size-3.5" />}
              onClick={() => void upload.importFiles()}
            >
              Reintentar
            </Button>
          )}
        </p>
      )}
      {picker}
    </Field>
  );
}

/** Takes a pasted YouTube link and checks it can play outside YouTube. */
function YouTubePicker({
  onPick,
  onUpload,
}: {
  onPick: (video: YouTubeVideo) => void;
  onUpload: () => void;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const request = useRef(0);

  function check(text: string) {
    setError(null);
    if (!text.trim()) return;
    if (!youTubeVideoId(text)) {
      setError("Ese enlace no es de YouTube.");
      return;
    }
    const id = ++request.current;
    startLoad(async () => {
      const result = await findYouTubeTrack(text);
      if (id !== request.current) return;
      if (result.video) onPick(result.video);
      else setError(result.error ?? "No pudimos usar ese enlace.");
    });
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <TextField
        id="track-link"
        name=""
        aria-label="Enlace de YouTube"
        placeholder="Pega el enlace de YouTube"
        icon={<Link2 />}
        value={link}
        autoComplete="off"
        onChange={(event) => {
          setLink(event.target.value);
          // A paste is a whole link: checked right away. Typing waits for Enter.
          if (
            event.nativeEvent instanceof InputEvent &&
            event.nativeEvent.inputType === "insertFromPaste"
          ) {
            check(event.target.value);
          } else {
            setError(null);
          }
        }}
        onKeyDown={(event) => {
          // Enter checks the link instead of saving the song.
          if (event.key !== "Enter") return;
          event.preventDefault();
          check(link);
        }}
        onBlur={() => check(link)}
        accessory={isLoading ? <Spinner className="size-4 text-ink-2" /> : undefined}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-2">
        Suena con el reproductor de YouTube y no ocupa espacio; necesita internet.{" "}
        <button
          type="button"
          onClick={onUpload}
          className="cursor-pointer font-semibold text-ink underline-offset-2 hover:underline"
        >
          O sube un MP3
        </button>{" "}
        para usarla sin internet.
      </p>
    </div>
  );
}

/** The chosen YouTube track, with YouTube's own player to listen to it here. */
function YouTubeTrackCard({ video, onRemove }: { video: YouTubeVideo; onRemove: () => void }) {
  const [isListening, setIsListening] = useState(false);
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3">
        <img
          src={youTubeThumbnail(video.videoId)}
          alt=""
          className="aspect-video w-24 shrink-0 rounded-sm object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold">{video.title}</p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
            <YouTubeBadge />
            {video.author && <span className="truncate">· {video.author}</span>}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={isListening ? <X className="size-4" /> : <Play className="size-4" />}
          onClick={() => setIsListening((value) => !value)}
        >
          {isListening ? "Cerrar" : "Escuchar"}
        </Button>
        <IconButton label="Quitar la pista" onClick={onRemove}>
          <X />
        </IconButton>
      </div>
      {isListening && (
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          title={video.title}
          allow="autoplay; encrypted-media"
          className="aspect-video w-full rounded-sm"
        />
      )}
    </div>
  );
}
