import { FileAudio, Pause, Pencil, Play, RotateCw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import type { MediaAsset } from "@shared/domain/models";
import { AppError, errorMessage } from "@shared/errors";
import { fileFacts } from "@renderer/features/media/media-format";
import { assetUrl } from "@renderer/features/media/upload/use-media-upload";
import { measureMediaUrl } from "@renderer/features/media/upload/measure";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { invoke } from "@renderer/lib/ipc";
import { useTrackPlayer } from "../use-track-player";

/** A song's track. `rename` is a new file name the person typed: it is applied when the song is saved. */
export type Track = { kind: "audio"; audio: MediaAsset; rename?: string };

type Props = {
  track: Track | null;
  onChange: (track: Track | null) => void;
  /** The song being edited, so its own track is not refused as "already used". */
  songId?: string;
  error?: string;
};

type Work =
  | { status: "idle" }
  | { status: "copying"; fileName: string; percent: number | null }
  | { status: "error"; message: string; retry: File | null };

const baseName = (fileName: string): string => fileName.replace(/\.[^.]+$/, "");

/**
 * One way to give a song its audio: pick or drop an MP3 from anywhere. Main keeps every track in
 * Iris/Audio: a file already there is used as it is, anything else is copied in and the original is
 * left where it was.
 */
export function TrackField({ track, onChange, songId, error }: Props) {
  const player = useTrackPlayer();
  // Copies made while this editor is open: if the song is not saved with them, they go to the trash.
  const copiedTracks = useRef(new Set<string>());
  const isOpen = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const [work, setWork] = useState<Work>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(track?.rename !== undefined);
  const isBusy = work.status === "copying";
  const audio = track?.audio ?? null;
  const isMissing = Boolean(audio && "isMissing" in audio && audio.isMissing);

  useEffect(() => {
    isOpen.current = true;
    const ids = copiedTracks.current;
    return () => {
      isOpen.current = false;
      for (const id of ids)
        void invoke("media:discard-track", id).catch((cause) => toast.error(errorMessage(cause)));
    };
  }, []);

  useEffect(
    () =>
      window.iris.onEvent("media:import-progress", (progress) => {
        setWork((current) =>
          current.status === "copying" && current.fileName === progress.fileName
            ? {
                ...current,
                percent: Math.round((progress.completedBytes / progress.totalBytes) * 100),
              }
            : current,
        );
      }),
    [],
  );

  function discard(id: string) {
    void invoke("media:discard-track", id).catch((cause) => toast.error(errorMessage(cause)));
  }

  function replaceTrack(next: Track | null) {
    const previousId = track?.audio.id;
    if (previousId && previousId !== next?.audio.id && copiedTracks.current.has(previousId)) {
      copiedTracks.current.delete(previousId);
      discard(previousId);
    }
    setIsRenaming(false);
    onChange(next);
  }

  async function choose(file: File | undefined) {
    if (!file || isBusy) return;
    if (!/\.mp3$/i.test(file.name)) {
      setWork({ status: "error", message: "Elige un archivo MP3.", retry: null });
      return;
    }
    setWork({ status: "copying", fileName: file.name, percent: null });
    try {
      const result = await window.iris.chooseTrack(file, songId);
      if (!result.ok)
        throw new AppError(result.error.code, result.error.message, result.error.fields);
      const { isCopied } = result.data;
      let asset = result.data.asset;
      if (!isOpen.current) {
        if (isCopied) discard(asset.id);
        return;
      }
      if (isCopied) copiedTracks.current.add(asset.id);
      if (asset.durationSeconds === null) {
        const measures = await measureMediaUrl(assetUrl(asset.id), "audio");
        asset = await invoke("media:set-measures", { id: asset.id, ...measures });
      }
      player.stop();
      replaceTrack({ kind: "audio", audio: asset });
      setWork({ status: "idle" });
      toast.success(
        isCopied
          ? "Audio copiado a la carpeta de Iris. El archivo original sigue donde estaba."
          : "Ese audio ya estaba en la carpeta de Iris: se usa sin copiarlo otra vez.",
      );
    } catch (cause) {
      setWork({ status: "error", message: errorMessage(cause), retry: file });
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    void choose(event.dataTransfer.files[0]);
  }

  const openPicker = () => fileInput.current?.click();
  const playState = audio ? player.stateOf(audio.id) : "idle";

  return (
    <Field id="track" label="Pista" error={error}>
      <input
        ref={fileInput}
        type="file"
        accept=".mp3,audio/mpeg"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input type="hidden" name="audioId" value={audio?.id ?? ""} />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "rounded-md border border-line bg-surface transition-colors",
          isDragging && "border-coral",
          error && "border-danger/80",
          !audio && !isBusy && "border-dashed",
        )}
      >
        {isBusy ? (
          <div className="flex items-center gap-3 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-success/14 text-success">
              <Spinner className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{work.fileName}</p>
              <p className="text-xs text-ink-2 tabular-nums">
                Copiando a la carpeta de Iris…{work.percent !== null && ` ${work.percent} %`}
              </p>
            </div>
          </div>
        ) : audio ? (
          <div className="flex items-center gap-3 p-3">
            <IconButton
              label={playState === "playing" ? "Pausar la pista" : "Escuchar la pista"}
              isActive={playState === "playing"}
              disabled={playState === "loading" || isMissing}
              onClick={() => void player.toggle(audio)}
              className="text-success"
            >
              {playState === "loading" ? (
                <Spinner className="size-4" />
              ) : playState === "playing" ? (
                <Pause />
              ) : (
                <Play />
              )}
            </IconButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{audio.fileName}</p>
              <p className="truncate text-xs text-ink-2">
                {isMissing
                  ? "No encontramos el archivo en la carpeta de Iris. Elige el MP3 otra vez."
                  : `${fileFacts(audio)}${audio.durationSeconds !== null ? ` · ${clock(audio.durationSeconds)}` : ""}`}
              </p>
            </div>
            <IconButton
              label="Renombrar el audio"
              isActive={isRenaming}
              onClick={() => {
                if (isRenaming) onChange({ kind: "audio", audio });
                else onChange({ kind: "audio", audio, rename: baseName(audio.fileName) });
                setIsRenaming(!isRenaming);
              }}
            >
              <Pencil />
            </IconButton>
            <Button variant="ghost" size="sm" onClick={openPicker}>
              Cambiar
            </Button>
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
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <FileAudio className="size-5 text-ink-2" aria-hidden />
            <p className="text-sm">Arrastra un MP3 aquí</p>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="size-4" />}
              onClick={openPicker}
            >
              Elegir archivo MP3
            </Button>
          </div>
        )}
      </div>
      {audio && isRenaming && (
        <TextField
          id="audio-name"
          label="Nombre del archivo de audio"
          hint="El archivo se renombra al guardar la canción."
          placeholder={baseName(audio.fileName)}
          value={track?.rename ?? ""}
          onChange={(event) => onChange({ kind: "audio", audio, rename: event.target.value })}
        />
      )}
      {work.status === "error" ? (
        <p role="alert" className="flex items-center gap-2 text-xs font-medium text-danger">
          {work.message}
          {work.retry && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCw className="size-3.5" />}
              onClick={() => void choose(work.retry ?? undefined)}
            >
              Reintentar
            </Button>
          )}
        </p>
      ) : (
        !audio &&
        !isBusy && (
          <p className="text-xs text-ink-2">
            Iris guarda una copia en su carpeta de audios; el archivo original no se toca.
          </p>
        )
      )}
    </Field>
  );
}
