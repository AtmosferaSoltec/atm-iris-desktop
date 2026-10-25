import { useDraggable } from "@dnd-kit/core";
import { Archive, Check, CirclePlay, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { memo } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@renderer/components/ui/context-menu";
import { Spinner } from "@renderer/components/ui/spinner";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { dragListener, type LibraryDragData } from "../dnd";
import type { LibraryEntry } from "../model";
import { ENTRY_ICONS } from "./entry-icons";

type Props = {
  entry: LibraryEntry;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (entry: LibraryEntry) => void;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (entry: LibraryEntry) => void;
  /** Songs only. */
  onArchive?: (entry: LibraryEntry) => void;
};

/** One song, file or YouTube video: double click or "+" adds it to the service; "⋯" edits or deletes it. */
export const LibraryRow = memo(function LibraryRow({
  entry,
  isAdded,
  isAdding,
  onAdd,
  onEdit,
  onDelete,
  onArchive,
}: Props) {
  const { icon: Icon, color } = ENTRY_ICONS[entry.icon];
  // Dragged to the service by pointer (the "+" is the keyboard's way). The overlay draws the
  // copy that follows the pointer, so the row itself only dims.
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
          onDoubleClick={() => !isAdded && onAdd(entry)}
          className={cn(
            "group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface",
            !isAdded && "cursor-grab",
            isDragging && "opacity-40",
          )}
          title={
            isAdded
              ? "Ya está en el servicio"
              : "Arrástralo al servicio, o doble clic para agregarlo"
          }
        >
          <Icon aria-hidden className="size-4 shrink-0" style={{ color }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{entry.title}</span>
            {(entry.subtitle || entry.hasYouTube || entry.hasAudio) && (
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
                <span className="truncate">{entry.subtitle}</span>
                {entry.hasAudio && (
                  <Music
                    role="img"
                    aria-label="Pista de audio"
                    className="size-3.5 shrink-0 text-ink-2"
                  />
                )}
                {entry.hasYouTube && (
                  <CirclePlay
                    role="img"
                    aria-label="Pista de YouTube"
                    className="size-3.5 shrink-0 text-danger"
                  />
                )}
              </span>
            )}
          </span>
          {entry.durationSeconds !== null && entry.icon !== "song" && (
            <span className="font-mono text-xs text-ink-2 tabular-nums">
              {clock(entry.durationSeconds)}
            </span>
          )}
          {isAdded ? (
            <Check aria-label="En el servicio" className="size-4 shrink-0 text-success" />
          ) : isAdding ? (
            <span role="status" aria-label="Agregando" className="shrink-0">
              <Spinner className="size-4 text-ink-2" />
            </span>
          ) : (
            // Not drawn: rows are dragged to the service. It stays for the keyboard and screen
            // readers, and shows itself when focused.
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
        {entry.kind !== "youtube" && (
          <ContextMenuItem onSelect={() => onEdit(entry)}>
            <Pencil />
            {entry.kind === "song" ? "Editar canción" : "Ver y editar"}
          </ContextMenuItem>
        )}
        {entry.kind === "song" && onArchive && !isAdded && (
          <ContextMenuItem onSelect={() => onArchive(entry)}>
            <Archive />
            Archivar
          </ContextMenuItem>
        )}
        <ContextMenuItem tone="danger" onSelect={() => onDelete(entry)}>
          <Trash2 />
          Eliminar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
