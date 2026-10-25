import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { IconButton } from "@renderer/components/ui/button";
import { ConfirmDialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { deleteMedia } from "./actions";
import type { SoundEntry } from "../model";
import type { LiveConsole } from "../use-live-console";
import { AddSoundDialog } from "./add-sound-dialog";
import { forgetSound, playSound } from "./play-sound";
import { soundIconOf } from "./sound-icons";

/** "Sonidos": the church's own sound effects, one click each; they play in the room. */
export function SoundsPanel({ ctrl }: { ctrl: LiveConsole }) {
  const { sounds } = ctrl;
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState<SoundEntry | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function remove(sound: SoundEntry) {
    startDelete(async () => {
      const result = await deleteMedia(sound.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      forgetSound(sound.id);
      ctrl.removeSound(sound.id);
      setDeleting(null);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-ink-2">Suenan en esta computadora, hacia los parlantes.</p>
        <IconButton label="Agregar sonido" onClick={() => setIsAdding(true)}>
          <Plus />
        </IconButton>
      </div>

      {sounds.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-2">No tienes ningún sonido.</p>
      ) : (
        <ul className="grid max-h-[50vh] grid-cols-3 gap-2.5 overflow-y-auto p-0.5">
          {sounds.map((sound) => {
            const Icon = soundIconOf(sound.icon);
            return (
              <li key={sound.id} className="group relative">
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await playSound(sound.id)))
                      toast.error("No pudimos reproducir el sonido.");
                  }}
                  className="flex h-[76px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-sm bg-surface px-1.5 text-center text-xs font-medium ring-1 ring-line transition ring-inset hover:bg-surface-raised hover:ring-line-strong active:scale-[0.97]"
                >
                  <Icon aria-hidden className="size-[18px] text-rose" />
                  <span className="line-clamp-1 w-full">{sound.title}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar «${sound.title}»`}
                  title="Eliminar"
                  onClick={() => setDeleting(sound)}
                  className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-danger/12 hover:text-danger focus-visible:opacity-100"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isAdding && <AddSoundDialog ctrl={ctrl} onClose={() => setIsAdding(false)} />}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="¿Eliminar este sonido?"
        description={deleting ? `«${deleting.title}» dejará de estar en tus sonidos.` : undefined}
        confirmLabel="Eliminar"
        isPending={isDeleting}
      />
    </div>
  );
}
