import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-surface text-ink-3 ring-1 ring-line [&_svg]:size-6">
        {icon}
      </span>
      <h3 className="mt-1 font-serif text-2xl font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
