import { cn } from "@renderer/lib/cn";

/** Placeholder block while a section loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-raised", className)} />
  );
}

/** A tile-sized placeholder with a heading row and a few lines. */
export function TileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 rounded-xl surface-panel p-6", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-sm" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}
