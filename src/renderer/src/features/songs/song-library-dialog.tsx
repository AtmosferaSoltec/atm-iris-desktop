import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Music, Plus } from "lucide-react";
import { Dialog } from "@renderer/components/ui/dialog";
import { Button, IconButton } from "@renderer/components/ui/button";
import { TextField } from "@renderer/components/ui/text-field";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { Spinner } from "@renderer/components/ui/spinner";
import { Banner } from "@renderer/components/ui/banner";
import { Pagination } from "@renderer/components/ui/pagination";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import {
  pageParser,
  searchParser,
  literalParser,
  useSearchParamState,
} from "@renderer/lib/search-params";
import { errorMessage } from "@shared/errors";
import { SongDialog } from "./song-dialog";

const ARCHIVE_PARSER = literalParser(["active", "archived"] as const, "active");
export function SongLibraryDialog({ onClose }: { onClose: () => void }) {
  const [songId, setSongId] = useState<string | null | undefined>();
  const [search, setSearch] = useSearchParamState("search", searchParser);
  const [page, setPage] = useSearchParamState("page", pageParser);
  const [archive, setArchive] = useSearchParamState("songs", ARCHIVE_PARSER);
  const client = useQueryClient();
  const songs = useQuery({
    queryKey: ["songs", search, page, archive],
    queryFn: () =>
      invoke("songs:list", {
        search,
        page,
        limit: 50,
        sort: "title",
        archived: archive === "archived",
      }),
  });
  const refresh = async (): Promise<void> => {
    await client.invalidateQueries({ queryKey: ["songs"] });
  };
  async function archiveSong(id: string): Promise<void> {
    try {
      await invoke(archive === "active" ? "songs:archive" : "songs:unarchive", id);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <Dialog open onClose={onClose} size="lg" title="Canciones">
      <div className="flex flex-col gap-5 pb-6">
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl
            label="Canciones"
            options={[
              { value: "active", label: "Canciones" },
              { value: "archived", label: "Archivadas" },
            ]}
            value={archive}
            onChange={(value) => {
              setArchive(value);
            }}
          />
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setSongId(null)}>
            Nueva canción
          </Button>
        </div>
        <TextField
          id="songs-search"
          label="Buscar"
          placeholder="Título, autor o letra"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {archive === "archived" && (
          <p className="text-xs text-ink-2">
            Las canciones archivadas conservan la letra y la pista.
          </p>
        )}
        {songs.isPending ? (
          <Spinner />
        ) : songs.isError ? (
          <Banner tone="error">{songs.error.message}</Banner>
        ) : (
          <>
            {songs.data.data.length === 0 ? (
              <EmptyState
                icon={<Music />}
                title={
                  archive === "archived" ? "No hay canciones archivadas." : "Aún no hay canciones"
                }
                description={search ? "Sin resultados." : undefined}
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {songs.data.data.map((song) => (
                  <li
                    key={song.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface"
                  >
                    <Music className="size-4 text-coral" />
                    <button
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      aria-label={`Editar «${song.title}»`}
                      onClick={() => setSongId(song.id)}
                    >
                      <span className="block truncate text-sm font-medium">{song.title}</span>
                      <span className="block truncate text-xs text-ink-2">{song.author}</span>
                    </button>
                    {archive === "archived" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArchiveRestore className="size-3.5" />}
                        onClick={() => void archiveSong(song.id)}
                      >
                        Restaurar
                      </Button>
                    ) : (
                      <IconButton
                        label={`Archivar «${song.title}»`}
                        onClick={() => void archiveSong(song.id)}
                      >
                        <ArchiveRestore />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Pagination meta={songs.data.meta} onPageChange={setPage} />
          </>
        )}
        {songId !== undefined && (
          <SongDialog
            key={songId ?? "new"}
            songId={songId}
            onClose={() => setSongId(undefined)}
            onSaved={() => {
              setSongId(undefined);
              void refresh();
            }}
            onDeleted={() => {
              setSongId(undefined);
              void refresh();
            }}
          />
        )}
      </div>
    </Dialog>
  );
}
