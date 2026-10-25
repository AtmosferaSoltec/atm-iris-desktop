import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { className: string; Icon: typeof Info }> = {
  error: { className: "bg-danger/12 text-danger ring-danger/35", Icon: TriangleAlert },
  success: { className: "bg-success/12 text-success ring-success/35", Icon: CircleCheck },
  info: { className: "bg-violet/12 text-ink-2 ring-violet/35", Icon: Info },
};

export function Banner({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-in items-start gap-2.5 rounded-md px-4 py-3 text-sm ring-1 ring-inset",
        toneClass,
        className,
      )}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
