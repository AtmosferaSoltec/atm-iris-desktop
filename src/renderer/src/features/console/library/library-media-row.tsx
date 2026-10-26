import { useDraggable } from "@dnd-kit/core";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { memo } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@renderer/components/ui/context-menu";
import { Spinner } from "@renderer/components/ui/spinner";
import { cn } from "@renderer/lib/cn";
import { dragListener, type LibraryDragData } from "../dnd";
import type { LibraryEntry } from "../model";
import { ENTRY_ICONS } from "./entry-icons";

type Props = {
  entry: LibraryEntry;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (entry: LibraryEntry) => void;
  /** Double click: straight to the screens. */
  onShow: (entry: LibraryEntry) => void;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (entry: LibraryEntry) => void;
};

/** Keeps media titles visible while preserving quick projection and service dragging. */
export const LibraryMediaRow = memo(function LibraryMediaRow({
  entry,
  isAdded,
  isAdding,
  onAdd,
  onShow,
  onEdit,
  onDelete,
}: Props) {
  const { icon: Icon, color } = ENTRY_ICONS[entry.icon];
  const data: LibraryDragData = { type: "library", entry };
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `library:${entry.id}`,
    data,
    disabled: isAdded,
  });
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...dragListener(listeners, "onPointerDown")}
          onDoubleClick={() => onShow(entry)}
          className={cn(
            "group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface",
            !isAdded && "cursor-grab",
            isDragging && "opacity-40",
          )}
          title={`${entry.title}: doble clic para mostrarlo en pantalla${isAdded ? " (ya está en el servicio)" : ", o arrástralo al servicio"}`}
        >
          <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line">
            {entry.previewUrl ? (
              entry.icon === "video" ? (
                // The first frame: metadata only, a hair in so it isn't black.
                <video
                  src={`${entry.previewUrl}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  aria-label={entry.title}
                  className="pointer-events-none size-full object-cover"
                />
              ) : (
                <img
                  src={entry.previewUrl}
                  alt={entry.title}
                  draggable={false}
                  className="pointer-events-none size-full object-cover"
                />
              )
            ) : (
              <span className="grid size-full place-items-center">
                <Icon aria-hidden className="size-6" style={{ color }} />
              </span>
            )}
            {entry.icon !== "image" && (
              <Icon
                aria-hidden
                className="absolute bottom-1 left-1 size-4 drop-shadow"
                style={{ color: "white" }}
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{entry.title}</span>
            {entry.subtitle && (
              <span className="block truncate text-xs text-ink-2">{entry.subtitle}</span>
            )}
          </span>
          {isAdded && (
            <Check aria-label="En el servicio" className="size-4 shrink-0 text-success" />
          )}
          {isAdding && (
            <span role="status" aria-label="Agregando" className="shrink-0">
              <Spinner className="size-4 text-ink-2" />
            </span>
          )}
          {!isAdded && !isAdding && (
            <button
              type="button"
              onClick={() => onAdd(entry)}
              aria-label={`Agregar «${entry.title}» al servicio`}
              className="sr-only focus-visible:not-sr-only focus-visible:grid focus-visible:size-7 focus-visible:shrink-0 focus-visible:cursor-pointer focus-visible:place-items-center focus-visible:rounded-full focus-visible:text-ink-2 focus-visible:ring-1 focus-visible:ring-line focus-visible:ring-inset"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {
          <ContextMenuItem onSelect={() => onEdit(entry)}>
            <Pencil />
            Ver y editar
          </ContextMenuItem>
        }
        <ContextMenuItem tone="danger" onSelect={() => onDelete(entry)}>
          <Trash2 />
          Eliminar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
