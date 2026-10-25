import { Check } from "lucide-react";
import { Spinner } from "@renderer/components/ui/spinner";
import { cn } from "@renderer/lib/cn";

/** Whether a file is already on the screens: a spinner while it loads, a check once it is there. */
export function FileStatus({
  state,
  className,
}: {
  state: "ready" | "loading" | null;
  className?: string;
}) {
  if (!state) return null;
  return state === "ready" ? (
    <span
      title="Listo en la pantalla"
      className={cn(
        "grid size-5 place-items-center rounded-full bg-success text-ink-inverse",
        className,
      )}
    >
      <Check aria-label="Listo en la pantalla" className="size-3" strokeWidth={3} />
    </span>
  ) : (
    <span
      title="Cargando en la pantalla…"
      className={cn("grid size-5 place-items-center rounded-full bg-black/60", className)}
    >
      <Spinner aria-label="Cargando en la pantalla" className="size-3 text-white" />
    </span>
  );
}
