import { Music, Search, User } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { cn } from "@renderer/lib/cn";
import type { FoundLyrics } from "@shared/domain/lyrics";
import { findLyrics } from "../actions";

/**
 * "Buscar letra": finds the lyrics in LRCLIB (a free lyrics database) by title and artist,
 * shows them, and hands the chosen one to the editor. Searches only on demand.
 */
export function LyricsSearchDialog({
  initialTitle,
  initialArtist,
  replacesLyrics,
  onClose,
  onPick,
}: {
  initialTitle: string;
  initialArtist: string;
  /** The editor already has lyrics: using these replaces them. */
  replacesLyrics: boolean;
  onClose: () => void;
  onPick: (found: FoundLyrics) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState(initialArtist);
  const [results, setResults] = useState<FoundLyrics[] | null>(null);
  const [selected, setSelected] = useState<FoundLyrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  function search() {
    setError(null);
    startSearch(async () => {
      const result = await findLyrics(title, artist);
      setResults(result.results ?? null);
      setSelected(result.results?.[0] ?? null);
      setError(result.error ?? null);
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Buscar letra"
      description="Busca en LRCLIB, una base de letras libre. Revisa la letra antes de guardar: la escriben sus usuarios."
      size="lg"
    >
      <form
        className="flex flex-col gap-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <TextField
            id="lyrics-title"
            name=""
            label="Canción"
            placeholder="Ej. Mi roca"
            icon={<Music />}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
          <TextField
            id="lyrics-artist"
            name=""
            label="Artista"
            placeholder="Opcional, ej. Hillsong"
            icon={<User />}
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
          />
          <Button
            type="submit"
            icon={<Search className="size-4" />}
            isLoading={isSearching}
            disabled={title.trim().length < 2}
          >
            Buscar
          </Button>
        </div>

        {error && <Banner tone="error">{error}</Banner>}
        {results && results.length === 0 && !error && (
          <p className="text-sm text-ink-2">
            No encontramos esa letra. Prueba con otro nombre o sin el artista.
          </p>
        )}

        {results && results.length > 0 && (
          <div
            className={cn(
              "grid gap-4 transition-opacity md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
              isSearching && "opacity-60",
            )}
          >
            <ul className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
              {results.map((found) => (
                <li key={found.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(found)}
                    aria-pressed={selected?.id === found.id}
                    className={cn(
                      "w-full cursor-pointer rounded-sm px-3 py-2 text-left transition-colors hover:bg-surface-raised",
                      selected?.id === found.id && "bg-surface-raised ring-1 ring-coral/50",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">{found.title}</span>
                    <span className="block truncate text-xs text-ink-2">
                      {[found.artist, found.album].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <div className="flex min-h-0 flex-col gap-3">
                <pre className="max-h-[360px] overflow-y-auto rounded-sm bg-surface p-4 font-serif text-[15px] leading-relaxed whitespace-pre-wrap ring-1 ring-line">
                  {selected.lyrics}
                </pre>
                <Button onClick={() => onPick(selected)}>
                  {replacesLyrics ? "Reemplazar mi letra con esta" : "Usar esta letra"}
                </Button>
              </div>
            )}
          </div>
        )}
        {isSearching && !results && (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Spinner className="size-4" /> Buscando…
          </p>
        )}
      </form>
    </Dialog>
  );
}
