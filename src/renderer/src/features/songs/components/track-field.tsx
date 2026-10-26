import { AudioPickerDialog } from "./audio-picker-dialog";
import { Pause, Play, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import type { MediaAsset } from "@shared/domain/models";
import { fileFacts } from "@renderer/features/media/media-format";
import { useMediaUpload } from "@renderer/features/media/upload/use-media-upload";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { useTrackPlayer } from "../use-track-player";

import { IMPORT_STATUS_TEXT as STATUS_TEXT } from "@renderer/features/media/messages";

export type Track = { kind: "audio"; audio: MediaAsset };

type Props = {
  track: Track | null;
  onChange: (track: Track | null) => void;
  error?: string;
};

export function TrackField({ track, onChange, error }: Props) {
  const player = useTrackPlayer();
  const importedTracks = useRef(new Set<string>());
  const isOpen = useRef(true);
  useEffect(() => {
    isOpen.current = true;
    const ids = importedTracks.current;
    return () => {
      isOpen.current = false;
      for (const id of ids)
        void invoke("media:discard-track", id).catch((error) => toast.error(errorMessage(error)));
    };
  }, []);
  function replaceTrack(next: Track | null) {
    const previousId = track?.audio.id;
    if (previousId && previousId !== next?.audio.id && importedTracks.current.has(previousId))
      void invoke("media:discard-track", previousId).catch((error) =>
        toast.error(errorMessage(error)),
      );
    setAudioName("");
    onChange(next);
  }
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isChoosingAudio, setIsChoosingAudio] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [audioName, setAudioName] = useState("");
  const upload = useMediaUpload("track", {
    onUploaded: async (asset) => {
      if (!isOpen.current) {
        await invoke("media:discard-track", asset.id);
        return;
      }
      player.stop();
      importedTracks.current.add(asset.id);
      replaceTrack({ kind: "audio", audio: asset });
      toast.success("Pista lista. Guarda la canción para conservarla.");
    },
  });
  const item = upload.items.at(-1);
  const isUploading = upload.isImporting;
  const audio = track?.kind === "audio" ? track.audio : null;

  function choose(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)) {
      toast.error("Elige un archivo MP3.");
      return;
    }
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
      accept=".mp3,audio/mpeg"
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
      {isChoosingAudio && (
        <AudioPickerDialog
          onClose={() => setIsChoosingAudio(false)}
          onPick={(asset) => {
            player.stop();
            replaceTrack({ kind: "audio", audio: asset });
          }}
        />
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={isUploading}
        onClick={() => setIsChoosingAudio(true)}
      >
        Elegir audio de Iris
      </Button>
      <input type="hidden" name="audioId" value={audio?.id ?? ""} />
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
                replaceTrack(null);
              }}
            >
              <X />
            </IconButton>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Elegir archivo MP3
          </Button>
        )}
      </div>
      {audio && (
        <div className="flex items-end gap-2">
          <TextField
            id="audio-name"
            label="Nombre del archivo de audio"
            placeholder={audio.fileName.replace(/\.[^.]+$/, "")}
            value={audioName}
            onChange={(event) => setAudioName(event.target.value)}
            containerClassName="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!audioName.trim()}
            isLoading={isRenaming}
            onClick={async () => {
              setIsRenaming(true);
              player.stop();
              try {
                const renamed = await invoke("media:rename", { id: audio.id, name: audioName });
                onChange({ kind: "audio", audio: renamed });
                setAudioName("");
                toast.success("Nombre del audio actualizado");
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setIsRenaming(false);
              }
            }}
          >
            Renombrar
          </Button>
        </div>
      )}
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
