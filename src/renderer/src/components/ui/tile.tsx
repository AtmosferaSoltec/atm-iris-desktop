import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { ReactNode } from "react";

type TileProps = {
  href: string;
  icon: ReactNode;
  color: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
};

/** Dashboard card that navigates (IrisTile). */
export function Tile({ href, icon, color, title, subtitle, children }: TileProps) {
  return (
    <Link
      to={href}
      className="group flex flex-col gap-5 rounded-xl surface-panel p-6 transition hover:-translate-y-0.5 hover:bg-surface-raised active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-sm [&_svg]:size-5"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="truncate text-sm text-ink-2">{subtitle}</p>
        </div>
        <ChevronRight
          aria-hidden
          className="size-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </div>
      {children && <div className="mt-auto">{children}</div>}
    </Link>
  );
}
