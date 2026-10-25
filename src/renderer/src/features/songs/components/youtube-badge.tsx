import { CirclePlay } from "lucide-react";
import { cn } from "@renderer/lib/cn";

/** Where a song's track comes from: YouTube. */
export function YouTubeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-2", className)}
      title="Pista de YouTube"
    >
      <CirclePlay aria-hidden className="size-3.5 text-danger" />
      YouTube
    </span>
  );
}
