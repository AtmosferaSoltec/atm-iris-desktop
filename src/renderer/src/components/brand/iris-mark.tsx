import ringUrl from "@renderer/assets/brand/iris-ring.svg";
import glintUrl from "@renderer/assets/brand/iris-glint.svg";
import logoUrl from "@renderer/assets/brand/iris-logo.svg";
import { cn } from "@renderer/lib/cn";

/** The logo symbol: spectrum ring + glint, stacked in the same square box. */
export function IrisMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <img src={ringUrl} alt="" className="absolute inset-0 size-full" />
      <img src={glintUrl} alt="" className="absolute inset-0 size-full" />
    </span>
  );
}

/** Symbol + "iris" wordmark (aspect 2.564 : 1). */
export function IrisWordmark({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Iris"
      width={Math.round(height * 2.564)}
      height={height}
      className={className}
    />
  );
}
