import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { LiveConsole } from "../use-live-console";
import { BibleDialog } from "./bible-dialog";

/** "Biblia", always at hand: the button, or V anywhere in the console. */
export function BibleButton({ ctrl }: { ctrl: Pick<LiveConsole, "presentPassage"> }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "v" && event.key !== "V") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      event.preventDefault();
      setIsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Proyectar un versículo (V)"
        className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface"
      >
        <BookOpen aria-hidden className="size-4 text-violet" />
        Biblia
      </button>
      {isOpen && <BibleDialog ctrl={ctrl} onClose={() => setIsOpen(false)} />}
    </>
  );
}
