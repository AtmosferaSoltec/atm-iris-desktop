import { BookOpen } from "lucide-react";
import { useEffect } from "react";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";

function openBible(): void {
  void invoke("window:open-bible", undefined).catch((error: Error) => toast.error(error.message));
}

/** "Biblia", always at hand: the button, or V anywhere in the console. It opens its own window. */
export function BibleButton() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "v" && event.key !== "V") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      event.preventDefault();
      openBible();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      onClick={openBible}
      title="Proyectar un versículo (V)"
      className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface"
    >
      <BookOpen aria-hidden className="size-4 text-violet" />
      Biblia
    </button>
  );
}
