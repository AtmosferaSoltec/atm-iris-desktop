import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, type DOMAttributes, type ReactNode } from "react";
import { ENTRY_ICONS } from "./library/entry-icons";
import type { LibraryEntry } from "./model";
import type { LiveConsole } from "./use-live-console";

/** The SERVICIO list as a whole: a library entry dropped on it goes to the end. */
export const SERVICE_DROP_ID = "service-drop";

/**
 * One of a drag handle's listeners, typed for JSX: a row takes `onPointerDown` (a pointer drags
 * it from anywhere) while its grip takes `onKeyDown` (the keyboard picks it up from there).
 */
export function dragListener<K extends "onPointerDown" | "onKeyDown">(
  listeners: SyntheticListenerMap | undefined,
  key: K,
): Pick<DOMAttributes<HTMLElement>, K> {
  return { [key]: listeners?.[key] } as Pick<DOMAttributes<HTMLElement>, K>;
}

/** What a library row carries while it is dragged to the service. */
export type LibraryDragData = { type: "library"; entry: LibraryEntry };

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para mover este elemento, pulsa la barra espaciadora. Con las flechas eliges el lugar y con la barra espaciadora lo sueltas. Escape cancela.",
};

const ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Tomaste el elemento ${position(active.data.current)}.`,
  onDragOver: ({ over }) => (over ? `Sobre el lugar ${position(over.data.current)}.` : ""),
  onDragEnd: ({ over }) => (over ? "Elemento soltado." : "Se canceló el movimiento."),
  onDragCancel: () => "Se canceló el movimiento.",
};

function position(data: unknown): string {
  const index = (data as { sortable?: { index?: number } } | undefined)?.sortable?.index;
  return index === undefined ? "" : String(index + 1);
}

/**
 * Drag and drop in the console: the service's rows reorder among themselves, and a song or file
 * dragged from the library lands in the service, at the end or between two rows. A 6 px move
 * starts a drag, so clicks and double clicks on the rows keep working.
 */
export function ConsoleDnd({ ctrl, children }: { ctrl: LiveConsole; children: ReactNode }) {
  const [dragging, setDragging] = useState<LibraryEntry | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { items, add, moveTo } = ctrl;

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over) return;
    const data = active.data.current as LibraryDragData | undefined;

    if (data?.type === "library") {
      const row = items.findIndex((item) => item.planItemId === over.id);
      if (row === -1) {
        void add(data.entry.kind, data.entry.id);
        return;
      }
      // Dropped on the lower half of a row: after it.
      const dragged = active.rect.current.translated;
      const isBelow =
        dragged && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
      void add(data.entry.kind, data.entry.id, isBelow ? row + 1 : row);
      return;
    }

    if (active.id === over.id) return;
    const to = items.findIndex((item) => item.planItemId === over.id);
    if (to !== -1) moveTo(String(active.id), to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements: ANNOUNCEMENTS, screenReaderInstructions: INSTRUCTIONS }}
      onDragStart={({ active }) => {
        const data = active.data.current as LibraryDragData | undefined;
        setDragging(data?.type === "library" ? data.entry : null);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {dragging && <LibraryDragPreview entry={dragging} />}
      </DragOverlay>
    </DndContext>
  );
}

function LibraryDragPreview({ entry }: { entry: LibraryEntry }) {
  const { icon: Icon, color } = ENTRY_ICONS[entry.icon];
  return (
    <div className="flex w-72 cursor-grabbing items-center gap-3 rounded-md bg-surface-raised px-3 py-2 shadow-xl ring-1 ring-line-strong">
      <Icon aria-hidden className="size-4 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{entry.title}</span>
        {entry.subtitle && (
          <span className="block truncate text-xs text-ink-2">{entry.subtitle}</span>
        )}
      </span>
    </div>
  );
}
