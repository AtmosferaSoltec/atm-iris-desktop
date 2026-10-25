import { cn } from "@renderer/lib/cn";

/**
 * Real vs. planned on a shared scale (IrisTimeBar): the bar is the real time,
 * the tick is the plan, and whatever passes the plan turns red.
 */
export function TimeBar({
  actual,
  planned,
  scale,
  muted,
  className,
}: {
  actual: number;
  planned: number;
  /** The longest value in the list, so bars compare across rows. */
  scale: number;
  muted?: boolean;
  className?: string;
}) {
  const max = Math.max(scale, actual, planned, 1);
  const within = Math.min(actual, planned);
  const over = Math.max(0, actual - planned);
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-raised",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-l-full",
          muted ? "bg-ink-3" : "bg-success",
        )}
        style={{ width: `${(within / max) * 100}%` }}
      />
      {over > 0 && (
        <div
          className="absolute inset-y-0 rounded-r-full bg-danger"
          style={{ left: `${(planned / max) * 100}%`, width: `${(over / max) * 100}%` }}
        />
      )}
      <div
        className="absolute inset-y-[-2px] w-0.5 rounded-full bg-ink"
        style={{ left: `calc(${(planned / max) * 100}% - 1px)` }}
      />
    </div>
  );
}
