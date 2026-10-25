import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      to={href}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 transition hover:text-ink"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
