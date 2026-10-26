import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import { eraseContent } from "../actions";

const OPTIONS = [
  { key: "songs", label: "Canciones", hint: "Con su letra y sus pistas subidas." },
  { key: "media", label: "Multimedia", hint: "Imágenes, videos y fondos." },
] as const;

type Choice = Record<(typeof OPTIONS)[number]["key"], boolean>;

export function ErasePanel() {
  const [choice, setChoice] = useState<Choice>({ songs: false, media: false });
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isErasing, startErase] = useTransition();
  const anyChosen = choice.songs || choice.media;

  function close() {
    setIsOpen(false);
    setWord("");
    setError(null);
  }

  function erase() {
    startErase(async () => {
      const result = await eraseContent({ ...choice, confirm: word });
      if (!result.result) {
        setError(result.error ?? "No pudimos eliminar.");
        return;
      }
      const { songs, media } = result.result;
      toast.success(`Se eliminó todo lo elegido (${songs} canciones, ${media} archivos)`);
      setChoice({ songs: false, media: false });
      close();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col divide-y divide-line">
        {OPTIONS.map((option) => (
          <li key={option.key} className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-ink-2">{option.hint}</span>
            </span>
            <input
              type="checkbox"
              aria-label={`Eliminar ${option.label.toLowerCase()}`}
              checked={choice[option.key]}
              onChange={(event) =>
                setChoice((current) => ({ ...current, [option.key]: event.target.checked }))
              }
              className="size-5 shrink-0 cursor-pointer accent-danger"
            />
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="danger"
          icon={<Trash2 className="size-4" />}
          disabled={!anyChosen}
          onClick={() => setIsOpen(true)}
        >
          Eliminar lo elegido
        </Button>
      </div>

      <Dialog
        open={isOpen}
        onClose={close}
        title="¿Eliminar todo lo elegido?"
        description="Se borra de golpe y no se puede deshacer. Si quieres conservar algo, descarga un respaldo antes."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={erase}
              isLoading={isErasing}
              disabled={word !== "ELIMINAR"}
            >
              Eliminar todo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          {error && <Banner tone="error">{error}</Banner>}
          <TextField
            id="erase-confirm"
            label="Escribe ELIMINAR para confirmar"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
}
