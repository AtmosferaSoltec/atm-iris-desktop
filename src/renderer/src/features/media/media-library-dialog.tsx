import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Image as ImageIcon, RefreshCw, Upload } from "lucide-react";
import type { MediaRole } from "@shared/domain/models";
import { errorMessage } from "@shared/errors";
import { Dialog } from "@renderer/components/ui/dialog";
import { Button } from "@renderer/components/ui/button";
import { Banner } from "@renderer/components/ui/banner";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { TextField } from "@renderer/components/ui/text-field";
import { Select } from "@renderer/components/ui/select";
import { Pagination } from "@renderer/components/ui/pagination";
import { Spinner } from "@renderer/components/ui/spinner";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { pageParser, searchParser, useSearchParamState } from "@renderer/lib/search-params";
import { MediaDetailDialog } from "./components/media-detail-dialog";
import { UploadQueue } from "./components/upload-queue";
import { ROLE_LABELS } from "./messages";
import { assetUrl, mediaKeys, useMediaUpload } from "./upload/use-media-upload";
import { measureMediaUrl } from "./upload/measure";

export function MediaLibraryDialog({
  onClose,
  initialRole = "library",
}: {
  onClose: () => void;
  initialRole?: MediaRole;
}) {
  const [role, setRole] = useState<MediaRole>(initialRole);
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useSearchParamState("search", searchParser);
  const [page, setPage] = useSearchParamState("page", pageParser);
  const client = useQueryClient();
  const upload = useMediaUpload(role);
  const query = useQuery({
    queryKey: [...mediaKeys.all, role, search, page],
    queryFn: () => invoke("media:list", { kind: "all", role, search, page, limit: 50 }),
  });
  const detail = useQuery({
    queryKey: [...mediaKeys.all, "detail", selectedId],
    queryFn: () => invoke("media:get", selectedId!),
    enabled: Boolean(selectedId),
  });
  useEffect(
    () =>
      window.iris.onEvent("media:changed", () => {
        void client.invalidateQueries({ queryKey: mediaKeys.all });
      }),
    [client],
  );
  async function open(id: string): Promise<void> {
    setSelectedId(id);
    const asset = await invoke("media:get", id);
    if (asset.needsMeasures && !asset.isMissing) {
      try {
        const measures = await measureMediaUrl(assetUrl(id), asset.kind);
        await invoke("media:set-measures", { id, ...measures });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    }
  }
  return (
    <Dialog open onClose={onClose} size="xl" title="Multimedia">
      <div
        className="flex flex-col gap-5 pb-6"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload.importFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select
            id="media-role"
            ariaLabel="Sección"
            value={role}
            options={(Object.keys(ROLE_LABELS) as MediaRole[]).map((value) => ({
              value,
              label: ROLE_LABELS[value],
            }))}
            onValueChange={(value) => {
              setRole(value as MediaRole);
              setPage(1);
            }}
          />
          <Button
            icon={<Upload className="size-4" />}
            isLoading={upload.isImporting}
            onClick={() => void upload.importFiles()}
          >
            Importar archivos
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw className="size-4" />}
            onClick={() =>
              void invoke("media:scan", undefined)
                .then(() => client.invalidateQueries({ queryKey: mediaKeys.all }))
                .catch((error) => toast.error(errorMessage(error)))
            }
          >
            Buscar archivos
          </Button>
          <Button
            variant="ghost"
            icon={<FolderOpen className="size-4" />}
            onClick={() => void invoke("media:open-home", undefined)}
          >
            Abrir carpeta de Iris
          </Button>
        </div>
        <TextField
          id="media-search"
          label="Buscar"
          placeholder="Título o descripción"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <UploadQueue
          items={upload.items}
          onRetry={() => void upload.importFiles()}
          onDismiss={upload.onDismiss}
          onClearFinished={upload.onClearFinished}
        />
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <Banner tone="error">{query.error.message}</Banner>
        ) : (
          <>
            {query.data.data.length === 0 ? (
              <EmptyState
                icon={<ImageIcon />}
                title="Aún no hay archivos"
                description="Agrega imágenes o videos a tu biblioteca."
              />
            ) : (
              <ul className="grid grid-cols-4 gap-3">
                {query.data.data.map((asset) => (
                  <li key={asset.id}>
                    <button
                      className="flex w-full cursor-pointer flex-col gap-2 rounded-md bg-surface p-3 text-left ring-1 ring-line hover:bg-surface-raised"
                      onClick={() => void open(asset.id)}
                    >
                      {asset.kind === "image" && !asset.isMissing && (
                        <img
                          src={assetUrl(asset.id)}
                          alt=""
                          className="aspect-video w-full rounded-sm object-cover"
                        />
                      )}
                      <span className="text-sm font-medium">{asset.title}</span>
                      {asset.isMissing && (
                        <span className="text-xs text-warning">Archivo no encontrado</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
        {detail.data && (
          <>
            <MediaDetailDialog
              asset={detail.data}
              url={detail.data.isMissing ? null : assetUrl(detail.data.id)}
              onClose={() => setSelectedId(undefined)}
              onSaved={() => void client.invalidateQueries({ queryKey: mediaKeys.all })}
              onDeleted={() => setSelectedId(undefined)}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
