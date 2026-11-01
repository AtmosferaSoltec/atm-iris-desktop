import { Music } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Combobox } from "@renderer/components/ui/combobox";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import type { AudioMatchPreview } from "@shared/schemas/audio-match";
import { AudioFolderActions } from "@renderer/features/songs/components/audio-folder-actions";
import { confirmAudioMatch, previewAudioMatch } from "../actions";

const NONE = "none";

export function AudioMatchPanel() {
  const [isSearching, startSearching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [preview, setPreview] = useState<AudioMatchPreview | null>(null);
  /** Songs whose automatic match is unchecked. Loose suggestions start unchecked. */
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  /** Joined by hand: song id → file id. */
  const [manual, setManual] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const chosen = preview?.matches.filter((match) => !skipped.has(match.songId)) ?? [];
  const manualPairs = Object.entries(manual).map(([songId, fileId]) => ({ songId, fileId }));
  const total = chosen.length + manualPairs.length;
  const usedByHand = new Set(Object.values(manual));

  function search() {
    setError(null);
    startSearching(async () => {
      const result = await previewAudioMatch();
      if (result.error) setError(result.error);
      else if (result.preview) {
        setSkipped(
          new Set(result.preview.matches.filter((match) => !match.isSure).map((m) => m.songId)),
        );
        setManual({});
        setPreview(result.preview);
      }
    });
  }

  function save() {
    if (!preview) return;
    startSaving(async () => {
      const result = await confirmAudioMatch(preview.token, [
        ...chosen.map((match) => ({ songId: match.songId, fileId: match.fileId })),
        ...manualPairs,
      ]);
      setPreview(null);
      if (result.error) setError(result.error);
      else
        toast.success(
          `Se asignaron ${plural(result.result!.assigned, "audio", "audios")}` +
            (result.result!.skipped ? `; ${result.result!.skipped} ya no estaban disponibles` : ""),
        );
    });
  }

  const unitedSongs = new Set(Object.keys(manual));
  const pendingSongs = preview?.unmatchedSongs ?? [];

  return (
    <div className="flex flex-col gap-4">
      {error && <Banner tone="error">{error}</Banner>}
      <AudioFolderActions />
      <div>
        <Button
          variant="secondary"
          icon={<Music className="size-4" />}
          onClick={search}
          isLoading={isSearching}
        >
          Buscar coincidencias
        </Button>
      </div>
      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Asignar audios"
        size="lg"
        description={
          preview
            ? `${plural(preview.matches.length, "coincidencia", "coincidencias")} · ${pendingSongs.length - unitedSongs.size} canciones y ${preview.unmatchedFiles.length - usedByHand.size} archivos sin pareja`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={save} isLoading={isSaving} disabled={total === 0}>
              {total === 0
                ? "No hay audios para asignar"
                : `Asignar ${plural(total, "audio", "audios")}`}
            </Button>
          </div>
        }
      >
        <div className="flex max-h-[60dvh] flex-col gap-5 overflow-y-auto pb-2">
          {preview?.matches.length === 0 && (
            <p className="text-sm text-ink-2">
              No encontramos coincidencias automáticas. Puedes unirlas a mano más abajo.
            </p>
          )}
          <ul className="flex flex-col divide-y divide-line">
            {preview?.matches.map((match) => (
              <li key={match.songId}>
                <label className="flex cursor-pointer items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-coral"
                    checked={!skipped.has(match.songId)}
                    onChange={(event) =>
                      setSkipped((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.delete(match.songId);
                        else next.add(match.songId);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {match.title}
                      {match.author && <span className="text-ink-2"> · {match.author}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-2">{match.fileName}</span>
                  </span>
                  {!match.isSure && (
                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Revisar
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          {pendingSongs.length > 0 && preview && (
            <section aria-label="Unir a mano">
              <h3 className="text-sm font-semibold">
                Unir a mano ({pendingSongs.length - unitedSongs.size} canciones sin audio)
              </h3>
              <p className="mb-2 text-xs text-ink-2">
                Elige para cada canción el archivo que le corresponde. No se borra nada: el archivo
                pasa a ser la pista de esa canción.
              </p>
              <ul className="flex flex-col divide-y divide-line">
                {pendingSongs.map((song) => (
                  <li key={song.songId} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {song.title}
                      {song.author && <span className="text-ink-2"> · {song.author}</span>}
                    </span>
                    <Combobox
                      id={`manual-${song.songId}`}
                      containerClassName="w-72 shrink-0"
                      searchPlaceholder="Buscar archivo"
                      emptyText="No quedan archivos sin canción"
                      value={manual[song.songId] ?? NONE}
                      onValueChange={(fileId) =>
                        setManual((current) => {
                          const next = { ...current };
                          if (fileId === NONE) delete next[song.songId];
                          else next[song.songId] = fileId;
                          return next;
                        })
                      }
                      options={[
                        { value: NONE, label: "Sin asignar" },
                        ...preview.unmatchedFiles
                          .filter(
                            (file) => !usedByHand.has(file.id) || manual[song.songId] === file.id,
                          )
                          .map((file) => ({ value: file.id, label: file.fileName })),
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Dialog>
    </div>
  );
}
