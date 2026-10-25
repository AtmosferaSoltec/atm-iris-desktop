import { LibraryFolderActions } from "./library-folder-actions";
import { useSearchParamState, literalParser, searchParser } from "@renderer/lib/search-params";
import { Archive, ListFilter, Search, X } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "@renderer/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import { Surface } from "@renderer/components/ui/surface";
import { TextField } from "@renderer/components/ui/text-field";
import { cn } from "@renderer/lib/cn";
import { nameKey } from "@shared/lib/text";
import type { LibraryEntry } from "../model";
import type { LiveConsole } from "../use-live-console";
import { archiveSong } from "./actions";
import { ArchivedSongs } from "./archived-songs";
import { LibraryDialogs, type LibraryDialog } from "./library-dialogs";
import { LibraryRow } from "./library-row";
import { LibraryMediaRow } from "./library-media-row";
import { LibraryToolbar } from "./library-toolbar";
import type { Library } from "./use-library";

import { MEDIA_EMPTY } from "../messages";

/**
 * Local media is discovered in Iris folders. Songs and YouTube links are created in dialogs;
 * dragging existing entries still builds the service, while media double-click projects directly.
 */
export function LibraryPanel({ ctrl, library }: { ctrl: LiveConsole; library: Library }) {
  const [tab, setTab] = useSearchParamState(
    "library",
    literalParser(["song", "media"] as const, "song"),
  );
  const [mediaTab, setMediaTab] = useSearchParamState(
    "kind",
    literalParser(["image", "video", "youtube"] as const, "image"),
  );
  const [query, setQuery] = useSearchParamState("search", searchParser);
  const [dialog, setDialog] = useState<LibraryDialog | null>(null);
  const [archiveMode, setArchiveMode] = useSearchParamState(
    "archive",
    literalParser(["active", "archived"] as const, "active"),
  );
  const showArchived = archiveMode === "archived";
  const [artistKey, setArtistKey] = useSearchParamState("artist", searchParser);
  const adding = useAdding(ctrl);
  const added = useMemo(() => new Set(ctrl.items.map((item) => item.refId)), [ctrl.items]);

  // The artists the songs already have, grouped by name (accents and case aside).
  const artists = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; count: number }>();
    for (const entry of library.entries) {
      const name = entry.author?.trim();
      if (entry.kind !== "song" || !name) continue;
      const key = nameKey(name);
      const group = groups.get(key);
      if (group) group.count += 1;
      else groups.set(key, { key, name, count: 1 });
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [library.entries]);
  // An artist whose songs are all gone is no filter at all.
  const artist = artists.find((candidate) => candidate.key === artistKey) ?? null;

  const entries = useMemo(() => {
    const key = nameKey(query);
    return library.entries.filter(
      (entry) =>
        (tab === "song"
          ? entry.kind === "song" && (!artist || nameKey(entry.author ?? "") === artist.key)
          : entry.icon === mediaTab) &&
        (!key || nameKey(`${entry.title} ${entry.subtitle}`).includes(key)),
    );
  }, [library.entries, tab, mediaTab, query, artist]);

  const edit = useCallback(
    (entry: LibraryEntry) =>
      setDialog(
        entry.kind === "song" ? { kind: "song", id: entry.id } : { kind: "media", id: entry.id },
      ),
    [],
  );
  const remove = useCallback((entry: LibraryEntry) => setDialog({ kind: "delete", entry }), []);
  const close = useCallback(() => setDialog(null), []);
  const { archived: hideArchived } = library;
  const archive = useCallback(
    async (entry: LibraryEntry) => {
      const result = await archiveSong(entry.id);
      if (result.error) toast.error(result.error);
      else {
        hideArchived(entry.id);
        toast.success(`«${entry.title}» se archivó`);
      }
    },
    [hideArchived],
  );

  return (
    <Surface
      role="region"
      aria-label="Biblioteca"
      className="flex min-h-0 flex-col gap-3 p-4"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        toast.info("Coloca los archivos en la carpeta de Iris y pulsa Actualizar biblioteca.");
      }}
    >
      <h2 className="px-1 eyebrow text-ink-2">Biblioteca</h2>
      <SegmentedControl
        label="Tipo de contenido"
        value={tab}
        onChange={setTab}
        options={[
          { value: "song", label: "Canciones" },
          { value: "media", label: "Multimedia" },
        ]}
      />

      {tab === "media" && (
        <SegmentedControl
          label="Tipo de multimedia"
          value={mediaTab}
          onChange={setMediaTab}
          options={[
            { value: "image", label: "Imágenes" },
            { value: "video", label: "Videos" },
            { value: "youtube", label: "YouTube" },
          ]}
        />
      )}

      {(tab === "song" || mediaTab === "youtube") && (
        <LibraryToolbar
          tab={tab === "song" ? "song" : mediaTab}
          onNewSong={() => setDialog({ kind: "song", id: null })}
          onYouTube={() => setDialog({ kind: "youtube" })}
        />
      )}
      <div role="group" aria-label="Controles de biblioteca" className="flex items-center gap-2">
        <TextField
          id="library-search"
          density="sm"
          type="search"
          aria-label="Buscar en la biblioteca"
          placeholder="Buscar"
          icon={<Search />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="min-w-0 flex-1"
        />
        {tab === "media" && mediaTab !== "youtube" && <LibraryFolderActions kind={mediaTab} />}
        {tab === "song" && artists.length > 0 && !showArchived && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={artist ? `Artista: ${artist.name}` : "Filtrar por artista"}
                title="Filtrar por artista"
                className={cn(
                  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm ring-1 transition ring-inset hover:bg-surface data-[state=open]:bg-surface",
                  artist ? "text-ink ring-coral/60" : "text-ink-2 ring-line",
                )}
              >
                <ListFilter aria-hidden className="size-4" />
                {artist && <span className="max-w-24 truncate">{artist.name}</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[50vh] overflow-y-auto">
              <DropdownMenuRadioGroup
                value={artist?.key ?? ""}
                onValueChange={(value) => setArtistKey(value)}
              >
                <DropdownMenuRadioItem value="">Todos los artistas</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {artists.map((candidate) => (
                  <DropdownMenuRadioItem key={candidate.key} value={candidate.key}>
                    <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
                    <span className="ml-3 text-xs text-ink-2 tabular-nums">{candidate.count}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {artist && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setArtistKey("")}>
                    <X />
                    Quitar el filtro
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {tab === "song" && (
        <button
          type="button"
          onClick={() => setArchiveMode(showArchived ? "active" : "archived")}
          aria-pressed={showArchived}
          className={cn(
            "-mt-1 flex h-7 cursor-pointer items-center gap-1.5 self-start rounded-full px-2.5 text-xs font-medium transition hover:text-ink",
            showArchived ? "bg-surface-raised text-ink" : "text-ink-2",
          )}
        >
          <Archive aria-hidden className="size-3.5" />
          {showArchived ? "Volver a la biblioteca" : "Archivadas"}
        </button>
      )}
      <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "song" && showArchived && (
          <li className="col-span-full">
            <ArchivedSongs library={library} query={query} />
          </li>
        )}
        {!(tab === "song" && showArchived) &&
          entries.map((entry) => {
            const common = {
              entry,
              isAdded: added.has(entry.id),
              isAdding: adding.id === entry.id,
              onAdd: adding.add,
              onEdit: edit,
              onDelete: remove,
              onArchive: archive,
            };
            return (
              <li key={entry.id}>
                {tab === "media" ? (
                  <LibraryMediaRow {...common} onShow={ctrl.presentQuick} />
                ) : (
                  <LibraryRow {...common} />
                )}
              </li>
            );
          })}
        {entries.length === 0 && !(tab === "song" && showArchived) && (
          <li className="col-span-full px-2 py-8 text-center text-sm text-ink-2">
            {query
              ? "Sin resultados."
              : tab === "song"
                ? "Aún no hay canciones. Crea la primera con «Nueva canción»."
                : MEDIA_EMPTY[mediaTab]}
          </li>
        )}
      </ul>
      <LibraryDialogs
        dialog={dialog}
        onClose={close}
        library={library}
        backgrounds={ctrl.backgrounds}
      />
    </Surface>
  );
}

/** Adding to the service, one at a time, with a spinner on the row being added. */
function useAdding(ctrl: LiveConsole) {
  const [id, setId] = useState<string | null>(null);
  const [, startAdd] = useTransition();
  const { add: addToService } = ctrl;
  const add = useCallback(
    (entry: LibraryEntry) => {
      if (id) return;
      setId(entry.id);
      startAdd(async () => {
        await addToService(entry.kind, entry.id);
        setId(null);
      });
    },
    [id, addToService],
  );
  return { id, add };
}
