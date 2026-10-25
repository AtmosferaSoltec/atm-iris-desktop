import { ArchiveRestore } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@renderer/components/ui/spinner";
import { toast } from "@renderer/components/ui/toaster";
import { nameKey } from "@shared/lib/text";
import type { LibraryEntry } from "../model";
import { archivedSongs, unarchiveSong } from "./actions";
import type { Library } from "./use-library";

/**
 * Explicitly archived songs keep their lyrics and tracks. Restoring puts them back in the library.
 */
export function ArchivedSongs({ library, query }: { library: Library; query: string }) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [, startRestore] = useTransition();
  const { restored } = library;

  useEffect(() => {
    let isCurrent = true;
    void archivedSongs().then((result) => {
      if (!isCurrent) return;
      if (result.error) toast.error(result.error);
      setEntries(result.entries ?? []);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  function restore(entry: LibraryEntry) {
    setRestoringId(entry.id);
    startRestore(async () => {
      const result = await unarchiveSong(entry.id);
      setRestoringId(null);
      if (result.error || !result.entry) {
        toast.error(result.error ?? "No pudimos restaurar la canción.");
        return;
      }
      setEntries((current) => current?.filter((candidate) => candidate.id !== entry.id) ?? null);
      restored(result.entry);
    });
  }

  if (entries === null) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-2">
        <Spinner className="size-4" /> Abriendo el archivo…
      </p>
    );
  }
  const key = nameKey(query);
  const shown = key
    ? entries.filter((entry) => nameKey(`${entry.title} ${entry.subtitle}`).includes(key))
    : entries;

  return (
    <>
      <p className="px-2 pb-1 text-xs text-ink-2">
        Las canciones archivadas conservan la letra y la pista.
      </p>
      {shown.length === 0 && (
        <p className="px-2 py-8 text-center text-sm text-ink-2">
          {query ? "Sin resultados." : "No hay canciones archivadas."}
        </p>
      )}
      {shown.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{entry.title}</span>
            {entry.subtitle && (
              <span className="block truncate text-xs text-ink-2">{entry.subtitle}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => restore(entry)}
            disabled={restoringId !== null}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface-raised disabled:cursor-default disabled:opacity-60"
          >
            {restoringId === entry.id ? (
              <Spinner className="size-3.5" />
            ) : (
              <ArchiveRestore aria-hidden className="size-3.5" />
            )}
            Restaurar
          </button>
        </div>
      ))}
    </>
  );
}
