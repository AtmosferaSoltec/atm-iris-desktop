import { spectrumColor } from "@shared/domain/rules";
import { cn } from "@renderer/lib/cn";

type TimelineBlock = { id: string; name: string; plannedMinutes: number };

/** Proportional capsules, one per block, in rotating spectrum colors. */
export function BlockTimeline({
  blocks,
  className,
}: {
  blocks: TimelineBlock[];
  className?: string;
}) {
  const total = blocks.reduce((sum, block) => sum + Math.max(1, block.plannedMinutes), 0);
  if (blocks.length === 0) return null;
  return (
    <div
      className={cn("flex h-2 w-full gap-1", className)}
      role="img"
      aria-label={blocks.map((b) => `${b.name} ${b.plannedMinutes} min`).join(", ")}
    >
      {blocks.map((block, index) => (
        <span
          key={block.id}
          className="h-full min-w-1.5 rounded-full"
          style={{
            flexGrow: Math.max(1, block.plannedMinutes) / total,
            backgroundColor: spectrumColor(index),
          }}
        />
      ))}
    </div>
  );
}
