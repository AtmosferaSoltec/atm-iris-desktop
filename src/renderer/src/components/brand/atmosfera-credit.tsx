import wordmarkUrl from "@renderer/assets/brand/atmosfera-wordmark.svg";
import { cn } from "@renderer/lib/cn";
import { invoke } from "@renderer/lib/ipc";

/** Quiet "made by" seal; opens the Atmosfera site in the system browser. */
export function AtmosferaCredit({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => void invoke("app:open-atmosfera", undefined)}
      className={cn(
        "group inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2 transition hover:text-ink",
        className,
      )}
    >
      Desarrollado por
      <img
        src={wordmarkUrl}
        alt="Atmosfera"
        height={16}
        className="h-4 w-auto opacity-80 transition group-hover:opacity-100"
      />
    </button>
  );
}
