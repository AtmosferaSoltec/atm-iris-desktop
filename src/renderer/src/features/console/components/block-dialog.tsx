import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, GripVertical, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextField } from "@renderer/components/ui/text-field";
import { BLOCK_MINUTES } from "@shared/domain/rules";
import { clock } from "@shared/lib/format";
import { cn } from "@renderer/lib/cn";
import { dragListener } from "../dnd";
import { firstInsertIndex, type ServiceTimer, type TimerBlock } from "../block-timer";

/** The block being added or edited, among the others of the list. */
const DRAFT_ID = "draft-block";

/**
 * "Agregar bloque" during a service, and its correction afterwards: an extra block for this time
 * only. It is placed by dragging it in the service's list (top runs first); the blocks already
 * done and the running one stay put. It is timed and saved in Tiempos, but the service keeps its
 * usual blocks (those change in Servicios).
 */
export function BlockDialog({
  timer,
  editing,
  onClose,
  onSave,
  onRemove,
}: {
  timer: ServiceTimer;
  /** An extra block that has not started: its name, minutes and place can still change. */
  editing?: TimerBlock;
  onClose: () => void;
  /** `at` is the block's index among the others (without it). */
  onSave: (block: { name: string; plannedSeconds: number }, at: number) => void;
  onRemove?: () => void;
}) {
  const others = timer.blocks.filter((block) => block.id !== editing?.id);
  const fixed = others.slice(0, firstInsertIndex({ ...timer, blocks: others }));
  const [order, setOrder] = useState<string[]>(() => {
    const pending = others.slice(fixed.length).map((block) => block.id);
    // A new block goes right after the running one (before the service starts: at the end).
    const at = editing
      ? timer.blocks.indexOf(editing) - fixed.length
      : timer.current === null
        ? pending.length
        : 0;
    return [...pending.slice(0, at), DRAFT_ID, ...pending.slice(at)];
  });
  const [name, setName] = useState(editing?.name ?? "");
  const [minutes, setMinutes] = useState(
    String(editing ? Math.round(editing.plannedSeconds / 60) : BLOCK_MINUTES.default),
  );
  const [errors, setErrors] = useState<{ name?: string; minutes?: string }>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(others.map((block) => [block.id, block]));
  const draftIndex = order.indexOf(DRAFT_ID);

  function move(to: number) {
    setOrder((current) => arrayMove(current, current.indexOf(DRAFT_ID), to));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setOrder((current) =>
      arrayMove(current, current.indexOf(String(active.id)), current.indexOf(String(over.id))),
    );
  }

  function save() {
    const trimmed = name.trim();
    const value = Number(minutes);
    const next = {
      name: !trimmed
        ? "Escribe el nombre del bloque."
        : trimmed.length > 60
          ? "Usa un nombre más corto."
          : undefined,
      minutes:
        !Number.isInteger(value) || value < BLOCK_MINUTES.min
          ? "Mínimo 1 minuto."
          : value > BLOCK_MINUTES.max
            ? "Máximo 240 minutos."
            : undefined,
    };
    setErrors(next);
    if (next.name || next.minutes) return;
    onSave({ name: trimmed, plannedSeconds: value * 60 }, fixed.length + draftIndex);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? "Editar bloque" : "Agregar bloque"}
      description="Solo para este servicio: se guarda en Tiempos, pero el servicio conserva sus bloques de siempre."
      size="md"
    >
      <form
        className="flex flex-col gap-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex gap-3">
          <TextField
            id="extra-block-name"
            label="Nombre"
            placeholder="Ej. Santa cena"
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            containerClassName="flex-1"
            autoFocus
          />
          <TextField
            id="extra-block-minutes"
            label="Minutos"
            inputMode="numeric"
            maxLength={3}
            value={minutes}
            error={errors.minutes}
            onChange={(event) => {
              setMinutes(event.target.value.replace(/\D/g, ""));
              setErrors((current) => ({ ...current, minutes: undefined }));
            }}
            containerClassName="w-28"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-ink-2">
            Ubicación · arrastra el bloque: arriba va primero, abajo al final
          </p>
          <ol
            aria-label="Orden de los bloques"
            className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md p-1 ring-1 ring-line ring-inset"
          >
            {fixed.map((block, index) => (
              <FixedRow
                key={block.id}
                block={block}
                position={index + 1}
                isRunning={index === timer.current}
              />
            ))}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {order.map((id, index) =>
                  id === DRAFT_ID ? (
                    <DraftRow
                      key={id}
                      name={name.trim() || "Bloque nuevo"}
                      minutes={Number(minutes) || 0}
                      position={fixed.length + index + 1}
                      canMoveUp={index > 0}
                      canMoveDown={index < order.length - 1}
                      onMoveUp={() => move(index - 1)}
                      onMoveDown={() => move(index + 1)}
                    />
                  ) : (
                    <PendingRow
                      key={id}
                      block={byId.get(id)!}
                      position={fixed.length + index + 1}
                    />
                  ),
                )}
              </SortableContext>
            </DndContext>
          </ol>
        </div>

        <div className="flex items-center gap-2">
          {editing && onRemove && (
            <Button
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              className="text-danger"
              onClick={onRemove}
            >
              Quitar bloque
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{editing ? "Guardar" : "Agregar"}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Every row keeps the same columns, so the times line up whether or not it can be moved. */
function RowContent({
  position,
  name,
  seconds,
  grip,
  end,
}: {
  position: number;
  name: string;
  seconds: number;
  grip?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <>
      <span className="grid size-7 shrink-0 place-items-center">{grip}</span>
      <span className="w-5 shrink-0 font-mono text-xs text-ink-2 tabular-nums">
        {String(position).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 font-mono text-xs text-ink-2 tabular-nums">{clock(seconds)}</span>
      <span className="flex w-14 shrink-0 items-center justify-end">{end}</span>
    </>
  );
}

/** Done or running: it cannot move, and nothing goes before it. */
function FixedRow({
  block,
  position,
  isRunning,
}: {
  block: TimerBlock;
  position: number;
  isRunning: boolean;
}) {
  return (
    <li className="flex h-10 items-center gap-3 rounded-sm px-1 text-sm text-ink-2">
      <RowContent
        position={position}
        name={block.name}
        seconds={block.plannedSeconds}
        end={
          <span className="grid size-7 place-items-center">
            {isRunning ? (
              <span aria-label="En curso" className="size-2 rounded-full bg-live" />
            ) : (
              <Check aria-label="Terminado" className="size-4" />
            )}
          </span>
        }
      />
    </li>
  );
}

/** A block still to come: it makes room while the new one is dragged, but is not dragged itself. */
function PendingRow({ block, position }: { block: TimerBlock; position: number }) {
  const { setNodeRef, transform, transition } = useSortable({
    id: block.id,
    disabled: { draggable: true },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="flex h-10 items-center gap-3 rounded-sm px-1 text-sm"
    >
      <RowContent position={position} name={block.name} seconds={block.plannedSeconds} />
    </li>
  );
}

function DraftRow({
  name,
  minutes,
  position,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  name: string;
  minutes: number;
  position: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: DRAFT_ID });
  return (
    <li
      ref={setNodeRef}
      // The whole row is dragged with the pointer; the grip is the keyboard's handle.
      {...dragListener(listeners, "onPointerDown")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-current="true"
      className={cn(
        "relative flex h-10 cursor-grab items-center gap-3 rounded-sm bg-coral/12 px-1 text-sm font-semibold ring-1 ring-coral ring-inset",
        isDragging && "z-10 cursor-grabbing shadow-xl",
      )}
    >
      <RowContent
        position={position}
        name={name}
        seconds={minutes * 60}
        grip={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...dragListener(listeners, "onKeyDown")}
            aria-label={`Mover «${name}»`}
            className="grid size-7 cursor-grab place-items-center rounded-full text-ink-2 hover:text-ink"
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        }
        end={
          <>
            <IconButton label="Subir" className="size-7" disabled={!canMoveUp} onClick={onMoveUp}>
              <ArrowUp />
            </IconButton>
            <IconButton
              label="Bajar"
              className="size-7"
              disabled={!canMoveDown}
              onClick={onMoveDown}
            >
              <ArrowDown />
            </IconButton>
          </>
        }
      />
    </li>
  );
}
