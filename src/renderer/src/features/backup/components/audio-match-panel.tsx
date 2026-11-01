import { Music } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import type { AudioMatchPreview } from "@shared/schemas/audio-match";
import { confirmAudioMatch, previewAudioMatch } from "../actions";

export function AudioMatchPanel() {
  const [isSearching, startSearching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [preview, setPreview] = useState<AudioMatchPreview | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const chosen = preview?.matches.filter((match) => !skipped.has(match.songId)) ?? [];

  function search() {
    setError(null);
    startSearching(async () => {
      const result = await previewAudioMatch();
      if (result.error) setError(result.error);
      else if (result.preview) {
        setSkipped(new Set());
        setPreview(result.preview);
      }
    });
  }

  function save() {
    if (!preview) return;
    startSaving(async () => {
      const result = await confirmAudioMatch(
        preview.token,
        chosen.map((match) => match.songId),
      );
      setPreview(null);
      if (result.error) setError(result.error);
      else
        toast.success(
          `Se asignaron ${plural(result.result!.assigned, "audio", "audios")}` +
            (result.result!.skipped ? `; ${result.result!.skipped} ya no estaban disponibles` : ""),
        );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Banner tone="error">{error}</Banner>}
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
            ? `${plural(preview.matches.length, "coincidencia", "coincidencias")} · ${preview.unmatchedSongs.length} canciones y ${preview.unmatchedFiles.length} archivos sin pareja`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={save} isLoading={isSaving} disabled={chosen.length === 0}>
              {chosen.length === 0
                ? "No hay audios para asignar"
                : `Asignar ${plural(chosen.length, "audio", "audios")}`}
            </Button>
          </div>
        }
      >
        <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto pb-2">
          {preview?.matches.length === 0 && (
            <p className="text-sm text-ink-2">
              No encontramos coincidencias. Revisa que los MP3 estén en la carpeta Iris/Audio y que
              su nombre se parezca al de la canción.
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
                </label>
              </li>
            ))}
          </ul>
          {preview && preview.unmatchedSongs.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Canciones sin audio ({preview.unmatchedSongs.length})
              </summary>
              <ul className="mt-2 text-xs text-ink-2">
                {preview.unmatchedSongs.map((song, index) => (
                  <li key={index} className="truncate">
                    {song.title}
                    {song.author && ` · ${song.author}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {preview && preview.unmatchedFiles.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Archivos sin canción ({preview.unmatchedFiles.length})
              </summary>
              <ul className="mt-2 text-xs text-ink-2">
                {preview.unmatchedFiles.map((fileName) => (
                  <li key={fileName} className="truncate">
                    {fileName}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Dialog>
    </div>
  );
}
