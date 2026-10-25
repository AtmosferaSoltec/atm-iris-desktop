import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

/** Small tinted capsule. `color` is any CSS color (token var or hex). */
export function Chip({
  color = "var(--color-ink-2)",
  icon,
  children,
  className,
}: {
  color?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
