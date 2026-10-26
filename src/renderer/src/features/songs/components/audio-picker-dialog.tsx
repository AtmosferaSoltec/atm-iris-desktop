import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextField } from "@renderer/components/ui/text-field";
import { Banner } from "@renderer/components/ui/banner";
import { Spinner } from "@renderer/components/ui/spinner";
import { Pagination } from "@renderer/components/ui/pagination";
import { invoke } from "@renderer/lib/ipc";
import { useSearchParamState, searchParser, pageParser } from "@renderer/lib/search-params";
import type { MediaAsset } from "@shared/domain/models";

export function AudioPickerDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
}) {
  const [search, setSearch] = useSearchParamState("track-search", searchParser);
  const [page, setPage] = useSearchParamState("track-page", pageParser);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["audio-picker", search, page],
    queryFn: () =>
      invoke("media:list", {
        kind: "audio",
        role: "track",
        mp3Only: true,
        search,
        page,
        limit: 20,
      }),
    staleTime: 0,
  });
  useEffect(
    () =>
      window.iris.onEvent("media:changed", () => {
        void client.invalidateQueries({ queryKey: ["audio-picker"] });
      }),
    [client],
  );
  return (
    <Dialog
      open
      onClose={onClose}
      title="Audio de Iris"
      size="md"
      description="Elige una pista que ya está en Iris/Audio. Se usa el archivo existente, sin copiarlo otra vez."
    >
      <div className="flex flex-col gap-4 pb-5">
        <TextField
          id="track-search"
          type="search"
          aria-label="Buscar audio"
          placeholder="Buscar"
          icon={<Search />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <Banner tone="error">{query.error.message}</Banner>
        ) : (
          <>
            <ul className="max-h-80 overflow-y-auto">
              {query.data.data.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    disabled={asset.isMissing}
                    onClick={() => {
                      onPick(asset);
                      onClose();
                    }}
                    className="flex w-full cursor-pointer flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="w-full truncate text-sm font-medium">{asset.title}</span>
                    <span className="w-full truncate text-xs text-ink-2">
                      {asset.isMissing ? "Archivo no encontrado" : asset.fileName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {query.data.meta.total === 0 && (
              <p className="text-sm text-ink-2">
                No hay pistas en Iris/Audio que coincidan con la búsqueda.
              </p>
            )}
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </Dialog>
  );
}
