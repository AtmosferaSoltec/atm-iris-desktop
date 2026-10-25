import { Check } from "lucide-react";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { DEFAULT_TYPOGRAPHY, type ProjectionBackground } from "@renderer/features/projection/model";
import { cn } from "@renderer/lib/cn";

/**
 * A song's own background, optional: it goes up when the song is presented, and can be
 * changed live without touching it. Sent with the form as `backgroundId` (empty = none).
 */
export function SongBackgroundField({
  backgrounds,
  value,
  onChange,
}: {
  backgrounds: ProjectionBackground[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Fondo de la canción (opcional)</legend>
      <input type="hidden" name="backgroundId" value={value} />
      <div className="grid grid-cols-4 gap-2">
        {[{ id: "", name: "Sin fondo propio" }, ...backgrounds].map((background) => {
          const isSelected = value === background.id;
          const real = backgrounds.find((candidate) => candidate.id === background.id) ?? null;
          return (
            <button
              key={background.id || "none"}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(background.id)}
              className="flex cursor-pointer flex-col gap-1 text-left"
            >
              <span
                className={cn(
                  "relative block overflow-hidden rounded-sm bg-black",
                  isSelected ? "ring-2 ring-white" : "ring-1 ring-line",
                )}
              >
                {real ? (
                  <ProjectionCanvas
                    frame={{
                      background: real,
                      content: { kind: "blank" },
                      typography: DEFAULT_TYPOGRAPHY,
                    }}
                  />
                ) : (
                  <span className="block aspect-video" />
                )}
                {isSelected && (
                  <Check
                    aria-hidden
                    className="absolute top-1 right-1 size-4 rounded-full bg-white p-0.5 text-black"
                  />
                )}
              </span>
              <span className="truncate text-xs text-ink-2">{background.name}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
