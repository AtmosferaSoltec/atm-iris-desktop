import { useSearchParamState, literalParser } from "@renderer/lib/search-params";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import { ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Chip } from "@renderer/components/ui/chip";
import { Surface } from "@renderer/components/ui/surface";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { DEFAULT_TYPOGRAPHY, type ProjectionFrame } from "@renderer/features/projection/model";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import type { ConsoleItem } from "../model";
import { SlideEditorDialog } from "./slide-editor-dialog";
import type { LiveConsole } from "../use-live-console";
import { ENTRY_ICONS, itemIconKey } from "../library/entry-icons";

import { KIND_NAMES } from "../messages";

/** Column 2 (IRIS_SPEC §6.2): the open item. Opening never changes the screens; clicking a card does. */
export function Workspace({ ctrl }: { ctrl: LiveConsole }) {
  const item = ctrl.openItem;
  const [view, setView] = useSearchParamState(
    "slides",
    literalParser(["cards", "list"] as const, "cards"),
  );

  return (
    <Surface className="@container flex min-h-0 flex-1 flex-col gap-4 p-5">
      {item ? (
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Chip color={ENTRY_ICONS[itemIconKey(item)].color}>{KIND_NAMES[item.kind]}</Chip>
              <h1 className="min-w-0 truncate font-serif text-xl leading-tight font-medium">
                {item.title}
              </h1>
              {item.subtitle && (
                <p className="hidden min-w-0 truncate text-sm text-ink-2 xl:block">
                  {item.subtitle}
                </p>
              )}
            </div>
            {(item.kind === "song" || item.kind === "bible") && (
              <SegmentedControl
                label="Vista de diapositivas"
                value={view}
                onChange={setView}
                options={[
                  { value: "cards", label: "Tarjetas" },
                  { value: "list", label: "Lista" },
                ]}
                className="shrink-0"
              />
            )}
          </div>
          {item.kind === "bible" && <VerseSteps ctrl={ctrl} item={item} />}
        </div>
      ) : (
        <h1 className="font-serif text-xl leading-tight font-medium text-ink-2">Servicio</h1>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!item ? (
          <EmptyHint />
        ) : item.kind === "song" || item.kind === "bible" ? (
          <SlideGrid ctrl={ctrl} item={item} view={view} />
        ) : (
          <MediaStage ctrl={ctrl} item={item} />
        )}
      </div>
    </Surface>
  );
}

function EmptyHint() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-2">
      <MousePointerClick aria-hidden className="size-7" />
      <p className="text-sm font-medium text-ink">Selecciona un elemento</p>
      <p className="text-xs">
        Ábrelo desde el servicio y haz clic en una diapositiva para enviarla a la pantalla.
      </p>
    </div>
  );
}

/** Compact operator cards use normal UI text; projection typography belongs to the live preview. */
function SlideGrid({
  ctrl,
  item,
  view,
}: {
  ctrl: LiveConsole;
  item: ConsoleItem;
  view: "cards" | "list";
}) {
  const isList = view === "list";
  const liveIndex = ctrl.live?.key === item.planItemId && !ctrl.isCleared ? ctrl.live.slide : -1;
  const liveCard = useRef<HTMLLIElement>(null);

  const [editing, setEditing] = useState<number | null>(null);
  const focus = item.focus;
  const focusCard = useRef<HTMLLIElement>(null);

  // Long songs: keep the card on the screens in view.
  useEffect(() => {
    liveCard.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [liveIndex]);

  // A passage opens on the verses it chose, in its whole chapter.
  useEffect(() => {
    focusCard.current?.scrollIntoView({ block: "start" });
  }, [item.planItemId]);

  if (item.slides.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-2">Esta canción no tiene letra.</p>;
  }

  return (
    <>
      <ol
        aria-label="Diapositivas"
        className={cn(
          "gap-3 p-1",
          isList
            ? "flex flex-col"
            : "grid grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-4 @4xl:grid-cols-5",
        )}
      >
        {item.slides.map((slide, index) => (
          <li
            key={slide.id}
            ref={index === liveIndex ? liveCard : index === focus?.first ? focusCard : undefined}
            className={cn(
              isList ? "flex items-center gap-3" : "flex flex-col gap-1.5",
              focus && (index < focus.first || index > focus.last) && "opacity-55",
            )}
          >
            <button
              type="button"
              onClick={() => ctrl.presentSlide(index)}
              onContextMenu={
                item.kind === "song"
                  ? (event) => {
                      event.preventDefault();
                      setEditing(index);
                    }
                  : undefined
              }
              title={
                item.kind === "song"
                  ? `${slide.text}\n\nClic derecho para editar o dividir`
                  : slide.text
              }
              aria-label={`Enviar a la pantalla: ${slide.label ?? `diapositiva ${index + 1}`}`}
              aria-current={index === liveIndex ? "true" : undefined}
              className={cn(
                "cursor-pointer overflow-hidden rounded-md transition-shadow",
                isList && "order-2 min-w-0 flex-1",
                index === liveIndex
                  ? "shadow-[0_0_24px_-4px_rgb(255_122_89/0.55)] ring-[3px] ring-coral"
                  : "ring-1 ring-line hover:ring-line-strong",
              )}
            >
              <span
                className={cn(
                  "flex flex-col justify-center gap-1 overflow-hidden bg-black px-2.5 py-2 text-left text-sm leading-snug text-white",
                  isList ? "min-h-16" : "h-24",
                )}
              >
                <span
                  className={cn(
                    "break-words whitespace-pre-line",
                    isList ? "line-clamp-2" : slide.footnote ? "line-clamp-3" : "line-clamp-4",
                  )}
                >
                  {slide.text}
                </span>
                {slide.footnote && (
                  <span className="truncate text-xs text-ink-2">{slide.footnote}</span>
                )}
              </span>
            </button>
            <span
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-2",
                isList && "order-1 w-24 shrink-0",
              )}
            >
              <span className="shrink-0 tabular-nums">{index + 1}</span>
              {slide.label && <span className="truncate">{slide.label}</span>}
            </span>
          </li>
        ))}
      </ol>
      {editing !== null && (
        <SlideEditorDialog
          item={item}
          index={editing}
          onClose={() => setEditing(null)}
          onSaved={(content) => ctrl.updateRef(item.refId, content)}
        />
      )}
    </>
  );
}

function MediaStage({ ctrl, item }: { ctrl: LiveConsole; item: ConsoleItem }) {
  const isActive =
    item.kind === "image"
      ? ctrl.live?.key === item.planItemId && !ctrl.isCleared
      : ctrl.playback?.key === item.planItemId && ctrl.playback.playing;

  const preview = useMemo<ProjectionFrame>(() => {
    if (item.kind === "image" && item.file) {
      return {
        background: null,
        content: { kind: "image", id: item.file.id, url: item.file.url },
        typography: DEFAULT_TYPOGRAPHY,
      };
    }
    if (item.kind === "video" && item.file) {
      return {
        background: null,
        content: {
          kind: "video",
          id: item.file.id,
          url: item.file.url,
          playing: false,
          position: 0,
          at: 0,
        },
        typography: DEFAULT_TYPOGRAPHY,
      };
    }
    return {
      background: null,
      content: {
        kind: "text",
        text: item.title,
        footnote: item.file?.durationSeconds ? clock(item.file.durationSeconds) : null,
      },
      typography: { ...DEFAULT_TYPOGRAPHY, fontSizePt: 64 },
    };
  }, [item]);

  if ((item.kind === "image" || item.kind === "video") && !item.file)
    return (
      <Banner tone="error">
        No encontramos el archivo. Busca el archivo en la biblioteca para revisar su ubicación.
      </Banner>
    );

  const hint =
    item.kind === "track"
      ? "La pista suena en el salón desde esta computadora; la pantalla no cambia."
      : item.kind === "video"
        ? "Controla el video desde el reproductor bajo EN VIVO."
        : "La imagen se muestra a pantalla completa.";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <button
        type="button"
        onClick={ctrl.presentMedia}
        disabled={isActive}
        className={cn(
          "relative w-full max-w-[640px] cursor-pointer overflow-hidden rounded-lg transition-shadow disabled:cursor-default",
          isActive
            ? "shadow-[0_0_32px_-6px_rgb(255_122_89/0.55)] ring-[3px] ring-coral"
            : "ring-1 ring-line hover:ring-line-strong",
        )}
      >
        <ProjectionCanvas frame={preview} />
        {isActive && (
          <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-white uppercase">
            {item.kind === "image" ? "En pantalla" : "Reproduciendo"}
          </span>
        )}
      </button>
      <Button size="lg" className="w-[300px]" disabled={isActive} onClick={ctrl.presentMedia}>
        {item.kind === "image"
          ? isActive
            ? "En pantalla"
            : "Mostrar en la pantalla"
          : isActive
            ? "Reproduciendo"
            : "Reproducir"}
      </Button>
      <p className="max-w-md text-center text-sm text-ink-2">{hint}</p>
    </div>
  );
}

/** A passage on the screens: the verse before or after (also ← →), through its chapter. */
function VerseSteps({ ctrl, item }: { ctrl: LiveConsole; item: ConsoleItem }) {
  const index = ctrl.live?.key === item.planItemId ? ctrl.live.slide : -1;
  return (
    <div className="mt-3 flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={<ChevronLeft className="size-4" />}
        disabled={index === 0}
        onClick={() => ctrl.step(-1)}
      >
        Anterior
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={index === item.slides.length - 1}
        onClick={() => ctrl.step(1)}
      >
        Siguiente
        <ChevronRight className="size-4" />
      </Button>
      {index >= 0 && (
        <span className="text-sm text-ink-2">En pantalla: {item.slides[index]?.label}</span>
      )}
    </div>
  );
}
