import { Banner } from "@renderer/components/ui/banner";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  Eraser,
  Trash2,
  Volume2,
  VolumeX,
  GripVertical,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@renderer/components/ui/button";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { Surface } from "@renderer/components/ui/surface";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { Popover, PopoverTrigger, PopoverContent } from "@renderer/components/ui/popover";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { plural } from "@shared/lib/text";
import type { ProjectionFrame } from "@renderer/features/projection/model";
import type { ConsoleItem } from "../model";
import { elapsedOf, type LiveConsole } from "../use-live-console";
import { FileStatus } from "./file-status";
import { dragListener, SERVICE_DROP_ID } from "../dnd";
import { ENTRY_ICONS, itemIconKey } from "../library/entry-icons";

/** SERVICIO over EN VIVO (IRIS_SPEC §6.2, column 1 of the iPad; right column on the desktop). */
export function ServicePanel({ ctrl }: { ctrl: LiveConsole }) {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isPreviewHidden, setIsPreviewHidden] = useState(readPreviewHidden);
  function setPreviewHidden(value: boolean) {
    setIsPreviewHidden(value);
    writePreviewHidden(value);
  }
  // The whole list is a drop target for what is dragged from the library.
  const { setNodeRef, isOver } = useDroppable({ id: SERVICE_DROP_ID });
  const { active } = useDndContext();
  const isReceiving = isOver || (active?.data.current?.type === "library" && !!active);

  return (
    <div className="flex min-h-0 flex-col gap-3 2xl:gap-4">
      <Surface
        role="region"
        aria-label="Servicio"
        className="flex min-h-0 flex-1 flex-col gap-1.5 p-3"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="eyebrow text-ink-2">
            Servicio <span className="ml-1 font-mono tabular-nums">{ctrl.items.length}</span>
          </h2>
          {ctrl.items.length > 0 && (
            <IconButton
              label="Vaciar servicio"
              onClick={() => setIsConfirmingClear(true)}
              className="hover:text-danger"
            >
              <Trash2 />
            </IconButton>
          )}
        </div>

        <div
          ref={setNodeRef}
          className={cn(
            "-mx-1 flex min-h-0 flex-1 flex-col rounded-md px-1 transition",
            isReceiving && "ring-1 ring-line-strong ring-inset",
            isOver && "bg-surface",
          )}
        >
          {ctrl.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-ink-2">
              <ListMusic aria-hidden className="size-7" />
              <p className="text-sm font-medium text-ink">Servicio vacío</p>
              <p className="text-xs">Arrastra canciones o multimedia desde la biblioteca.</p>
            </div>
          ) : (
            <SortableContext
              items={ctrl.items.map((item) => item.planItemId)}
              strategy={verticalListSortingStrategy}
            >
              <ol
                aria-label="Elementos del servicio"
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
              >
                {ctrl.items.map((item, index) => (
                  <ServiceRow
                    key={item.planItemId}
                    item={item}
                    index={index}
                    fileState={ctrl.fileState}
                    isOpen={item.planItemId === ctrl.openKey}
                    isLive={item.planItemId === ctrl.live?.key && !ctrl.isCleared}
                    onOpen={() => ctrl.setOpenKey(item.planItemId)}
                    onRemove={() => ctrl.remove(item.planItemId)}
                  />
                ))}
              </ol>
            </SortableContext>
          )}
        </div>
      </Surface>

      <Surface role="region" aria-label="Pantalla en vivo" className="flex flex-col gap-2.5 p-3">
        {isPreviewHidden ? (
          <LiveStrip frame={ctrl.liveFrame} isCleared={ctrl.isCleared} />
        ) : (
          <div className="relative overflow-hidden rounded-md ring-1 ring-line-strong">
            <ProjectionCanvas
              frame={ctrl.liveFrame}
              transitions
              playsVideo
              onVideoTime={(time) => ctrl.followVideo(time.id, time.position, time.duration)}
              onVideoError={(message) => {
                if (ctrl.liveFrame.content.kind === "video")
                  ctrl.reportPlaybackError(ctrl.liveFrame.content.id, message);
              }}
            />
            <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white uppercase backdrop-blur">
              <span className="size-1.5 animate-pulse-live rounded-full bg-live" />
              En vivo
            </span>
          </div>
        )}
        {/* One row for the player and the screen's buttons: the service list keeps the height. */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {ctrl.playback ? <NowPlaying ctrl={ctrl} /> : <OpenTrack ctrl={ctrl} />}
          </div>
          <PreviewControls
            ctrl={ctrl}
            isPreviewHidden={isPreviewHidden}
            onTogglePreview={() => setPreviewHidden(!isPreviewHidden)}
          />
        </div>
        {ctrl.playback && <PlaybackBar ctrl={ctrl} />}
        {ctrl.playback && <OpenTrack ctrl={ctrl} />}
      </Surface>

      <ConfirmDialog
        open={isConfirmingClear}
        onClose={() => setIsConfirmingClear(false)}
        onConfirm={() => {
          ctrl.clear();
          setIsConfirmingClear(false);
        }}
        title="¿Vaciar el servicio?"
        description="Se quita todo lo que está en el servicio. Esta acción no se puede deshacer."
        confirmLabel={`Quitar ${plural(ctrl.items.length, "elemento")}`}
      />
    </div>
  );
}

function ServiceRow({
  item,
  index,
  fileState,
  isOpen,
  isLive,
  onOpen,
  onRemove,
}: {
  item: ConsoleItem;
  index: number;
  /** Whether the item's file is already on the screens. */
  fileState: LiveConsole["fileState"];
  isOpen: boolean;
  isLive: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { icon: Icon, color } = ENTRY_ICONS[itemIconKey(item)];
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.planItemId });
  return (
    <li
      ref={setNodeRef}
      // The whole row is dragged with the pointer; the grip is the keyboard's handle.
      {...dragListener(listeners, "onPointerDown")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md py-1 pr-2 pl-2.5 transition-colors",
        isOpen ? "bg-surface-raised" : "hover:bg-surface-raised",
        isDragging &&
          "relative z-10 cursor-grabbing bg-surface-raised opacity-90 shadow-xl ring-1 ring-line-strong",
      )}
    >
      {isOpen && (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-accent"
        />
      )}
      <button
        type="button"
        onClick={onOpen}
        title={item.subtitle ? `${item.title} · ${item.subtitle}` : item.title}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
        onKeyDown={(event) => {
          if (event.key === "Delete" || event.key === "Backspace") onRemove();
        }}
      >
        <span className="w-5 shrink-0 font-mono text-xs text-ink-2 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="grid size-7 shrink-0 place-items-center rounded-sm"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
        {/* One line per element: the title, then the author dimmed, then the track's length. */}
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="max-w-full shrink-0 truncate text-sm font-semibold">{item.title}</span>
          {isLive && (
            <span
              aria-label="En vivo"
              className="size-1.5 shrink-0 self-center rounded-full bg-live"
            />
          )}
          {item.subtitle && (
            <span className="min-w-0 shrink-[100] truncate text-xs text-ink-2">
              {item.subtitle}
            </span>
          )}
        </span>
        {(item.kind === "song" || item.kind === "track") && item.file && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-ink-2">
            <Music role="img" aria-label="Audio MP3" className="size-3.5" />
            {item.file.durationSeconds !== null && (
              <span className="font-mono tabular-nums">{clock(item.file.durationSeconds)}</span>
            )}
          </span>
        )}
        {(item.kind === "image" || item.kind === "video") && item.file && (
          <FileStatus state={fileState(item.file.id)} className="mr-1" />
        )}
      </button>
      {/* Over the row's end, only on hover or focus: hidden, they take no room from the title. */}
      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 rounded-r-md bg-gradient-to-l from-surface-raised from-70% pl-6 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...dragListener(listeners, "onKeyDown")}
          aria-label={`Mover «${item.title}»`}
          className="pointer-events-auto grid size-6 shrink-0 cursor-grab place-items-center rounded-full text-ink-2 hover:text-ink"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
        <IconButton
          label={`Quitar «${item.title}»`}
          className="pointer-events-auto size-6 shrink-0 ring-0 hover:text-danger"
          onClick={onRemove}
        >
          <X />
        </IconButton>
      </span>
    </li>
  );
}

/**
 * The open song's track, ready to play. It never starts or replaces anything by itself: with
 * nothing loaded it is the player's idle state; with another track loaded, that one keeps
 * playing and this is only an offer to switch.
 */
function OpenTrack({ ctrl }: { ctrl: LiveConsole }) {
  const item = ctrl.openItem;
  if (!item || item.kind !== "song" || !item.file) return null;
  if (ctrl.playback?.key === item.planItemId) return null;
  const duration = item.file?.durationSeconds;

  if (ctrl.playback) {
    return (
      <button
        type="button"
        onClick={ctrl.toggleTrack}
        className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-xs font-medium text-ink-2 ring-1 ring-line transition ring-inset hover:bg-surface hover:text-ink"
      >
        <Music aria-hidden className="size-3.5" />
        <span className="truncate">Cambiar a la pista de «{item.title}»</span>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        aria-label={`Reproducir la pista de «${item.title}»`}
        title="Reproducir la pista (P)"
        onClick={ctrl.toggleTrack}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-coral text-ink-inverse transition hover:brightness-110 active:scale-95"
      >
        <Play aria-hidden className="ml-0.5 size-4.5" fill="currentColor" />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        <span className="block text-xs text-ink-2">
          Pista lista{duration ? ` · ${clock(duration)}` : ""}
        </span>
      </span>
    </div>
  );
}

/** Mini player (IRIS_SPEC §6.2): only while a track or a video is loaded. The main button and what plays. */
function NowPlaying({ ctrl }: { ctrl: LiveConsole }) {
  const playback = ctrl.playback!;
  const isTrack = playback.kind === "track";
  return (
    <div className="flex items-center gap-2.5">
      {/* The main control: always the same solid button, only its icon changes. */}
      <button
        type="button"
        aria-label={playback.playing ? "Pausar" : "Reproducir"}
        title={playback.playing ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
        disabled={Boolean(playback.error)}
        onClick={ctrl.togglePlay}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-coral text-ink-inverse transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {playback.playing ? (
          <Pause aria-hidden className="size-4.5" fill="currentColor" />
        ) : (
          <Play aria-hidden className="ml-0.5 size-4.5" fill="currentColor" />
        )}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{playback.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-2">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              playback.error ? "bg-danger" : isTrack ? "bg-success" : "bg-rose",
              playback.playing && !playback.error && "animate-pulse-live",
            )}
          />
          <span className="truncate">
            {playback.error
              ? "Reproducción no disponible"
              : !playback.playing
                ? "En pausa"
                : isTrack
                  ? "Sonando en el salón"
                  : "Reproduciendo en la pantalla"}
          </span>
        </span>
      </span>
    </div>
  );
}

/** Where the track or video goes, and the rest of its buttons, in one thin row under the player. */
function PlaybackBar({ ctrl }: { ctrl: LiveConsole }) {
  const playback = ctrl.playback!;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playback.playing) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [playback.playing]);

  const elapsed = elapsedOf(playback, playback.playing ? now : playback.at);
  const remaining = Math.max(0, playback.duration - elapsed);
  const isTrack = playback.kind === "track";

  return (
    <div className="flex flex-col gap-2">
      {playback.error && (
        <Banner tone="error">
          La pista no está disponible. Puedes seguir proyectando la letra. Edita la canción para
          elegir otra pista o un archivo local.
        </Banner>
      )}
      <div className="flex items-center gap-1.5">
        <IconButton label="Desde el inicio" className="size-7" onClick={() => ctrl.seek(0)}>
          <SkipBack />
        </IconButton>
        <span className="w-9 shrink-0 text-right font-mono text-[11px] text-ink-2 tabular-nums">
          {clock(Math.floor(elapsed))}
        </span>
        <input
          type="range"
          disabled={Boolean(playback.error)}
          aria-label="Posición"
          min={0}
          max={Math.max(playback.duration, 1)}
          step={0.5}
          value={elapsed}
          onChange={(event) => ctrl.seek(Number(event.target.value))}
          className="min-w-0 flex-1 accent-coral"
        />
        <span className="w-10 shrink-0 font-mono text-[11px] text-ink-2 tabular-nums">
          -{clock(Math.ceil(remaining))}
        </span>
        {!isTrack && (
          <IconButton
            label="Silenciar en pantalla"
            className="size-7"
            aria-pressed={ctrl.isScreenMuted}
            onClick={() => ctrl.setIsScreenMuted(!ctrl.isScreenMuted)}
          >
            <Music />
          </IconButton>
        )}
        <IconButton label="Detener" className="size-7" onClick={ctrl.stopPlayback}>
          <Square />
        </IconButton>
        <IconButton
          label="Repetir"
          aria-pressed={playback.loop}
          onClick={ctrl.toggleLoop}
          className={cn("size-7", playback.loop && "bg-coral/15 text-coral ring-coral/40")}
        >
          <Repeat />
        </IconButton>
      </div>
    </div>
  );
}

function PreviewControls({
  ctrl,
  isPreviewHidden,
  onTogglePreview,
}: {
  ctrl: LiveConsole;
  isPreviewHidden: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <IconButton
        label="Limpiar pantalla (B)"
        aria-pressed={ctrl.isCleared}
        isActive={ctrl.isCleared}
        onClick={ctrl.toggleCleared}
      >
        <Eraser />
      </IconButton>
      <Popover>
        <PopoverTrigger asChild>
          <IconButton label="Volumen">{ctrl.volume === 0 ? <VolumeX /> : <Volume2 />}</IconButton>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="flex w-24 min-w-0 flex-col items-center gap-3"
        >
          <label htmlFor="playback-volume" className="text-xs font-medium text-ink-2">
            Volumen
          </label>
          <input
            id="playback-volume"
            aria-label="Volumen"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(ctrl.volume * 100)}
            onChange={(event) => ctrl.setVolume(Number(event.target.value) / 100)}
            className="h-32 w-6 accent-coral [direction:rtl] [writing-mode:vertical-lr]"
          />
          <span className="text-xs text-ink-2 tabular-nums">{Math.round(ctrl.volume * 100)} %</span>
        </PopoverContent>
      </Popover>
      <IconButton
        label={isPreviewHidden ? "Mostrar la vista previa" : "Ocultar la vista previa"}
        aria-pressed={isPreviewHidden}
        onClick={onTogglePreview}
      >
        {isPreviewHidden ? <ChevronUp /> : <ChevronDown />}
      </IconButton>
    </div>
  );
}

/** The preview folded away: one line with what the screens show, so the service list gets the room. */
function LiveStrip({ frame, isCleared }: { frame: ProjectionFrame; isCleared: boolean }) {
  const content = frame.content;
  const text = isCleared
    ? "Pantalla limpia"
    : content.kind === "text"
      ? content.text.split("\n")[0]!
      : content.kind === "image"
        ? "Imagen"
        : content.kind === "video"
          ? "Video"
          : content.kind === "youtube"
            ? "YouTube"
            : content.kind === "timer"
              ? "Cronómetro"
              : "Solo el fondo";
  return (
    <p className="flex min-w-0 items-center gap-2 rounded-md bg-black px-3 py-2 text-sm text-white ring-1 ring-line-strong">
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase">
        <span className="size-1.5 animate-pulse-live rounded-full bg-live" />
        En vivo
      </span>
      <span className="truncate">{text}</span>
    </p>
  );
}

const PREVIEW_HIDDEN_KEY = "iris.preview-hidden";

/** Folding the preview is this computer's choice; it is only a convenience, so a failure is ignored. */
function readPreviewHidden(): boolean {
  try {
    return localStorage.getItem(PREVIEW_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writePreviewHidden(value: boolean): void {
  try {
    localStorage.setItem(PREVIEW_HIDDEN_KEY, value ? "1" : "0");
  } catch {
    // The preview still folds for this session.
  }
}
