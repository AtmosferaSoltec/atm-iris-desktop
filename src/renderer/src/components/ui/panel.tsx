import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { Surface } from "./surface";

/** A titled settings section: Surface + serif heading + one-line description. */
export function Panel({
  title,
  description,
  accessory,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  accessory?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("flex flex-col gap-6 p-6 sm:p-8", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-medium tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
        </div>
        {accessory}
      </header>
      {children}
    </Surface>
  );
}
