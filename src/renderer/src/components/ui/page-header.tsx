import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

/** Serif screen title + description, with actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  titleAccessory,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Next to the title, e.g. a help popover. */
  titleAccessory?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <h1 className="font-serif text-4xl font-medium tracking-tight">{title}</h1>
          {titleAccessory}
        </div>
        {description && <p className="mt-2 max-w-xl text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  children,
  accessory,
  className,
}: {
  children: ReactNode;
  accessory?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="eyebrow text-ink-2">{children}</h2>
      {accessory}
    </div>
  );
}
