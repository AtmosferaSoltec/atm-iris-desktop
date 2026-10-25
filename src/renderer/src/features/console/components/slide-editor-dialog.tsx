import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextArea } from "@renderer/components/ui/text-area";
import { parseLyrics } from "@shared/lib/lyrics";
import { plural } from "@shared/lib/text";
import type { ConsoleItem } from "../model";
import { editSongSlide, type ItemContent } from "../library/actions";

/**
 * One slide of a song, opened with a right click: edit its text, or split it into several
 * slides with a blank line. Saved in the song itself.
 */
export function SlideEditorDialog({
  item,
  index,
  onClose,
  onSaved,
}: {
  item: ConsoleItem;
  index: number;
  onClose: () => void;
  onSaved: (content: ItemContent) => void;
}) {
  const slide = item.slides[index];
  const [text, setText] = useState(slide?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  if (!slide) return null;

  const count = parseLyrics(text).length;

  function save() {
    setError(null);
    startSave(async () => {
      const result = await editSongSlide(item.refId, index, slide.text, text);
      if (result.content) {
        onSaved(result.content);
        onClose();
      } else setError(result.error ?? "No pudimos guardar la diapositiva.");
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={slide.label ? `${item.title} · ${slide.label}` : item.title}
      description={`Diapositiva ${index + 1}. Deja una línea en blanco para partirla en dos.`}
      footer={
        <>
          <span className="mr-auto text-xs text-ink-2">
            {count > 1 ? `Quedará en ${plural(count, "diapositiva")}` : null}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} isLoading={isSaving} disabled={count === 0}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        {error && <Banner tone="error">{error}</Banner>}
        <TextArea
          id="slide-text"
          aria-label="Texto de la diapositiva"
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
          className="min-h-48 font-serif text-[17px]"
          spellCheck
        />
      </div>
    </Dialog>
  );
}
