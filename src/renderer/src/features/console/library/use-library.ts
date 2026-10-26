import { useCallback, useState } from "react";
import { toast } from "@renderer/components/ui/toaster";
import type { LibraryEntry } from "../model";
import type { LiveConsole } from "../use-live-console";
import { libraryItem } from "./actions";
import { sortEntries } from "./entries";

/**
 * BIBLIOTECA's own state: the songs and files, kept current here after a song is saved, a
 * file uploaded or something deleted, without reloading the console. What is in the service
 * follows through `ctrl` (the only thing it touches there).
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- The inferred result is the library controller contract.
export function useLibrary(
  initial: LibraryEntry[],
  ctrl: Pick<LiveConsole, "updateRef" | "dropRef">,
) {
  const [entries, setEntries] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setEntries(initial);
  }
  const { updateRef, dropRef } = ctrl;

  const upsert = useCallback(
    (entry: LibraryEntry) =>
      setEntries((current) =>
        sortEntries([...current.filter((candidate) => candidate.id !== entry.id), entry]),
      ),
    [],
  );

  const forget = useCallback(
    (id: string) => {
      setEntries((current) => current.filter((candidate) => candidate.id !== id));
      dropRef(id);
    },
    [dropRef],
  );

  /** Archived: out of the list, but a copy already in the service stays there. */
  const archived = useCallback(
    (id: string) => setEntries((current) => current.filter((candidate) => candidate.id !== id)),
    [],
  );

  /** Brought back from the archive. */
  const restored = useCallback(
    (entry: LibraryEntry) => {
      upsert(entry);
      toast.success(`«${entry.title}» volvió a la biblioteca`);
    },
    [upsert],
  );

  /** After saving or editing: the latest version, in the list and in the service. */
  const refresh = useCallback(
    async (kind: "song" | "media", id: string) => {
      const result = await libraryItem(kind, id);
      if (result.gone) forget(id);
      else if (result.entry) {
        upsert(result.entry);
        if (result.content) updateRef(id, result.content);
      } else if (result.error) toast.error(result.error);
    },
    [forget, upsert, updateRef],
  );

  return { entries, refresh, forget, archived, restored };
}

export type Library = ReturnType<typeof useLibrary>;
