import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@shared/domain/models";
import { cn } from "@renderer/lib/cn";
import { IconButton } from "./button";

const count = new Intl.NumberFormat("es");

/** "1–20 de 134" with previous / next. */
export function Pagination({
  meta,
  onPageChange,
  className,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (meta.total === 0) return null;
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.total, meta.page * meta.limit);
  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-between gap-4 text-sm text-ink-2", className)}
    >
      <span className="tabular-nums">
        {count.format(first)}–{count.format(last)} de {count.format(meta.total)}
      </span>
      {meta.totalPages > 1 && (
        <div className="flex gap-2">
          <IconButton
            label="Página anterior"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            label="Página siguiente"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
          >
            <ChevronRight />
          </IconButton>
        </div>
      )}
    </nav>
  );
}
