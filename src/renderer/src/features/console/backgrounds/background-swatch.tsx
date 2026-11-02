import { Film, X } from "lucide-react";
import { memo, useState } from "react";
import { thumbnailUrl } from "@shared/lib/asset-url";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { DEFAULT_TYPOGRAPHY, type ProjectionBackground } from "@renderer/features/projection/model";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import { FileStatus } from "../components/file-status";

/** The system's still of a video (`iris-media://thumb`); the gradient stays when there is none. */
function VideoThumbnail({ id }: { id: string }) {
  const [hasFailed, setHasFailed] = useState(false);
  if (hasFailed) return null;
  return (
    <img
      src={thumbnailUrl(id)}
      alt=""
      decoding="async"
      draggable={false}
      onError={() => setHasFailed(true)}
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
}

/** One background to choose; a church's own (a file) can also be deleted from here. */
export const BackgroundSwatch = memo(function BackgroundSwatch({
  name,
  background,
  isSelected,
  onSelect,
  onDelete,
  state = null,
}: {
  name: string;
  background?: ProjectionBackground;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  /** Whether a church background (a file) is already on the screens. */
  state?: "ready" | "loading" | null;
}) {
  return (
    <div className="group relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onSelect}
        className="flex cursor-pointer flex-col gap-1.5 text-left"
        aria-pressed={isSelected}
      >
        <span
          className={cn(
            "relative block overflow-hidden rounded-sm",
            isSelected ? "ring-2 ring-white" : "ring-1 ring-line",
          )}
        >
          {/* A video background is a still thumbnail here: twenty videos playing at once would
              load the computer. The film badge says it moves on the screens. */}
          <ProjectionCanvas
            frame={{
              background: background?.videoUrl
                ? { ...background, videoUrl: undefined }
                : (background ?? null),
              content: { kind: "blank" },
              typography: DEFAULT_TYPOGRAPHY,
            }}
          />
          {background?.videoUrl && <VideoThumbnail id={background.id} />}
          {background?.videoUrl && (
            <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white tabular-nums">
              <Film aria-hidden className="size-3" />
              {background.durationSeconds ? clock(Math.round(background.durationSeconds)) : null}
            </span>
          )}
          <FileStatus state={state} className="absolute right-1 bottom-1" />
        </span>
        <span className="truncate text-xs text-ink-2">{name}</span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar el fondo ${name}`}
          className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-danger focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
});
