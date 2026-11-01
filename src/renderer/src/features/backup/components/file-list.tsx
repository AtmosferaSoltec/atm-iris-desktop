import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { Pagination } from "@renderer/components/ui/pagination";
import { TextField } from "@renderer/components/ui/text-field";
import { nameKey } from "@shared/lib/text";
import type { LocalMediaAsset } from "@shared/domain/models";

const PREVIEW_COUNT = 5;
const PAGE_SIZE = 20;

/** A short list with its first items; the full list opens in a dialog with search and pages. */
export function FileList({
  assets,
  title,
  suffix = "",
  onRemove,
}: {
  assets: LocalMediaAsset[];
  title: string;
  suffix?: string;
  onRemove: (asset: LocalMediaAsset) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const matching = assets.filter((asset) => nameKey(asset.title).includes(nameKey(search)));
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = matching.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const row = (asset: LocalMediaAsset): React.JSX.Element => (
    <li key={asset.id} className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 truncate text-sm">
        {asset.title}
        {suffix}
      </span>
      <Button variant="ghost" size="sm" onClick={() => onRemove(asset)}>
        Quitar
      </Button>
    </li>
  );

  return (
    <>
      <ul className="divide-y divide-line">{assets.slice(0, PREVIEW_COUNT).map(row)}</ul>
      {assets.length > PREVIEW_COUNT && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => setIsOpen(true)}>
          Mostrar todos ({assets.length})
        </Button>
      )}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} title={title} size="md">
        <div className="flex flex-col gap-3 pb-5">
          <TextField
            id="file-list-search"
            type="search"
            aria-label="Buscar archivo"
            placeholder="Buscar"
            icon={<Search />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto">{visible.map(row)}</ul>
          {matching.length === 0 && (
            <p className="text-sm text-ink-2">Ningún archivo coincide con la búsqueda.</p>
          )}
          <Pagination
            meta={{
              page: current,
              limit: PAGE_SIZE,
              total: matching.length,
              totalPages,
            }}
            onPageChange={setPage}
          />
        </div>
      </Dialog>
    </>
  );
}
