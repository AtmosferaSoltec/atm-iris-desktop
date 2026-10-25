import { Music, Quote, Trash2, User } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { SlidePreview } from "@renderer/components/projection/slide-preview";
import { Banner } from "@renderer/components/ui/banner";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Chip } from "@renderer/components/ui/chip";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { SectionHeader } from "@renderer/components/ui/page-header";
import { useForm } from "react-hook-form";
import { invoke } from "@renderer/lib/ipc";
import { AppError, errorMessage, parseInput, toFormErrors } from "@shared/errors";
import { songFormSchema } from "@shared/schemas/songs";
import { Surface } from "@renderer/components/ui/surface";
import { TextArea } from "@renderer/components/ui/text-area";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import type { Song } from "@shared/domain/models";
import { formatLyrics, parseLyrics } from "@shared/lib/lyrics";
import { SongBackgroundField } from "@renderer/features/console/backgrounds/song-background-field";
import type { ProjectionBackground } from "@renderer/features/projection/model";
import type { YouTubeVideo } from "@shared/lib/youtube";
import { plural } from "@shared/lib/text";
import type { SongField } from "@shared/schemas/songs";
import { TrackField, type Track } from "./track-field";

const FORM_ID = "song-form";

/** A screen with more lines than this is hard to read from the back of the room. */
const COMFORTABLE_LINES = 6;

/**
 * A song's lyrics and track (contract §10), opened from the console's library. It says when
 * it saved or deleted the song; whoever opened it decides what follows.
 */
export function SongEditor({
  song,
  youtubeVideo,
  backgrounds,
  actionsSlot,
  onSaved,
  onDeleted,
  onCancel,
}: {
  song?: Song;
  /** The song's YouTube track with its title. */
  youtubeVideo?: YouTubeVideo;
  /** The church's backgrounds: with them, the song can have its own. */
  backgrounds?: ProjectionBackground[];
  /** The dialog's header: Eliminar, Cancelar and Guardar go there, always in sight. */
  actionsSlot: HTMLElement | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const {
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Record<SongField, string>>();
  async function save(): Promise<void> {
    clearErrors();
    try {
      const input = parseInput(songFormSchema, {
        title,
        author,
        lyrics,
        audioId: track?.kind === "audio" ? track.audio.id : "",
        youtubeId: track?.kind === "youtube" ? track.video.videoId : "",
        backgroundId,
      });
      const saved = song
        ? await invoke("songs:update", { id: song.id, input })
        : await invoke("songs:create", input);
      toast.success("Canción guardada");
      if (saved.warning) toast.warning(saved.warning);
      onSaved(saved.song.id);
    } catch (error) {
      const fields = ["title", "author", "lyrics", "audioId", "youtubeId", "backgroundId"] as const;
      const mapped = toFormErrors(error, fields);
      if (error instanceof AppError && error.fields?.sections) {
        mapped.fields.lyrics = error.fields.sections;
        mapped.message = undefined;
      }
      for (const field of fields)
        if (mapped.fields[field]) setError(field, { message: mapped.fields[field] });
      if (mapped.message) setError("root", { message: mapped.message });
    }
  }
  const [title, setTitle] = useState(song?.title ?? "");
  const [author, setAuthor] = useState(song?.author ?? "");
  const [lyrics, setLyrics] = useState(song ? formatLyrics(song.sections) : "");
  const [track, setTrack] = useState<Track | null>(() =>
    song?.audio
      ? { kind: "audio", audio: song.audio }
      : song?.youtubeId
        ? {
            kind: "youtube",
            video: {
              ...(youtubeVideo ?? {
                videoId: song.youtubeId,
                title: "Video de YouTube",
                author: "",
              }),
            },
          }
        : null,
  );
  const trackId =
    track?.kind === "audio" ? track.audio.id : track?.kind === "youtube" ? track.video.videoId : "";
  // A background that was deleted since is not offered (and not sent back).
  const [backgroundId, setBackgroundId] = useState(
    backgrounds?.some((candidate) => candidate.id === song?.backgroundId)
      ? (song?.backgroundId ?? "")
      : "",
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [shouldDeleteAudio, setShouldDeleteAudio] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const sections = parseLyrics(lyrics);
  // A field's error disappears as soon as its value changes from what was submitted.
  const errorFor = (field: SongField, _value: string) => errors[field]?.message;

  function confirmDelete() {
    if (!song) return;
    startDelete(async () => {
      try {
        await invoke("songs:delete", { id: song.id, deleteAudio: shouldDeleteAudio });
      } catch (error) {
        setDeleteError(errorMessage(error));
        return;
      }
      toast.success(`Se eliminó «${song.title}»`);
      setIsConfirmingDelete(false);
      onDeleted();
    });
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={handleSubmit(save)}
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      noValidate
    >
      {actionsSlot &&
        createPortal(
          <>
            {song && (
              <IconButton
                label="Eliminar canción"
                className="hover:text-danger"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2 />
              </IconButton>
            )}
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} isLoading={isSubmitting}>
              Guardar
            </Button>
          </>,
          actionsSlot,
        )}
      <Surface className="flex flex-col gap-6 self-start p-6 sm:p-8">
        {(errors.root?.message || deleteError) && (
          <Banner tone="error">{errors.root?.message ?? deleteError}</Banner>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="title"
            label="Título"
            placeholder="Ej. Sublime gracia"
            icon={<Quote />}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              clearErrors("title");
            }}
            error={errorFor("title", title)}
            autoFocus={!song}
          />
          <TextField
            id="author"
            label="Autor"
            placeholder="Opcional"
            icon={<User />}
            value={author}
            onChange={(event) => {
              setAuthor(event.target.value);
              clearErrors("author");
            }}
            error={errorFor("author", author)}
          />
        </div>
        <TrackField
          track={track}
          onChange={setTrack}
          error={
            errorFor("audioId", track?.kind === "audio" ? trackId : "") ??
            errorFor("youtubeId", track?.kind === "youtube" ? trackId : "")
          }
        />
        {backgrounds && (
          <SongBackgroundField
            backgrounds={backgrounds}
            value={backgroundId}
            onChange={setBackgroundId}
          />
        )}
        <TextArea
          id="lyrics"
          label="Letra"
          placeholder={"#Estrofa 1\nSublime gracia del Señor\nque a un pecador salvó\n\n#Coro\n…"}
          value={lyrics}
          onChange={(event) => {
            setLyrics(event.target.value);
            clearErrors("lyrics");
          }}
          error={errorFor("lyrics", lyrics)}
          hint="Deja una línea en blanco entre diapositivas. Para nombrar una, escribe # y el nombre en su primera línea (por ejemplo #Coro). Si la canción tiene pista, la letra es opcional."
          className="min-h-[420px] font-serif text-[17px]"
          spellCheck
        />
      </Surface>

      <section aria-label="Vista previa" className="flex flex-col gap-4">
        <SectionHeader
          accessory={
            <span className="text-xs text-ink-2 tabular-nums">
              {plural(sections.length, "diapositiva")}
            </span>
          }
        >
          Vista previa en el TV
        </SectionHeader>
        {sections.length === 0 ? (
          <Surface>
            {track ? (
              <EmptyState
                icon={<Music />}
                title="Solo pista"
                description="Sin letra, en la consola solo suena la pista y la pantalla se queda como está. Puedes agregar la letra cuando quieras."
              />
            ) : (
              <EmptyState
                icon={<Quote />}
                title="Aún no hay diapositivas"
                description="Escribe o pega la letra y aquí verás cómo se proyecta cada parte."
              />
            )}
          </Surface>
        ) : (
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-5">
            {sections.map((section, index) => {
              const lineCount = section.text.split("\n").length;
              return (
                <li key={index} className="flex flex-col gap-1.5">
                  <SlidePreview text={section.text} />
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-ink-2">
                      {section.label ?? `Diapositiva ${index + 1}`}
                    </span>
                    {lineCount > COMFORTABLE_LINES && (
                      <Chip color="var(--color-warning)">{lineCount} líneas</Chip>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        isPending={isDeleting}
        title={`¿Eliminar «${song?.title}»?`}
        description={
          song?.audio ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shouldDeleteAudio}
                onChange={(event) => setShouldDeleteAudio(event.target.checked)}
              />
              Eliminar también la pista (se enviará a la papelera).
            </label>
          ) : (
            "Se quitará de la biblioteca. Esta acción no se puede deshacer."
          )
        }
        confirmLabel="Eliminar"
      />
    </form>
  );
}
