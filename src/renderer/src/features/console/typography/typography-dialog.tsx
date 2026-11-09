import { useMemo, useState, useTransition } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { SLIDE_TEXT_SIZE } from "@shared/domain/console";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import type { ProjectionFrame, ProjectionTypography } from "@renderer/features/projection/model";
import type { LiveConsole } from "../use-live-console";
import { saveSlideTextSize, saveTypography } from "./actions";
import { SizeControl, TypographyFields } from "./typography-fields";

const SAMPLE = "Sublime gracia del Señor\nque a un pecador salvó";

/**
 * How the lyrics look on the screens: typeface, size, bold, italic and capitals. The
 * preview shows the background in use and the slide on screen; "Aplicar" changes the
 * screens at once and keeps it for the church. It also sets the size of the plain text on
 * the console's own slide cards, which only the operator sees.
 */
export function TypographyDialog({ ctrl, onClose }: { ctrl: LiveConsole; onClose: () => void }) {
  const [draft, setDraft] = useState<ProjectionTypography>(ctrl.typography);
  const [slideSize, setSlideSize] = useState(ctrl.slideTextSize);
  const [isSaving, startSave] = useTransition();
  const set = (change: Partial<ProjectionTypography>) =>
    setDraft((current) => ({ ...current, ...change }));

  const { liveFrame } = ctrl;
  const preview = useMemo<ProjectionFrame>(
    () => ({
      background: liveFrame.background,
      content:
        liveFrame.content.kind === "text"
          ? liveFrame.content
          : { kind: "text", text: SAMPLE, footnote: null },
      typography: draft,
    }),
    [liveFrame.background, liveFrame.content, draft],
  );

  function apply() {
    ctrl.setTypography(draft);
    ctrl.setSlideTextSize(slideSize);
    startSave(async () => {
      const [screens, cards] = await Promise.all([
        saveTypography(draft),
        saveSlideTextSize(slideSize),
      ]);
      const result = { error: screens.error ?? cards.error };
      if (result.error) toast.error(`Se aplicó, pero no pudimos guardarlo: ${result.error}`);
      else toast.success("Texto actualizado");
      onClose();
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="Texto"
      description="Cómo se ve la letra en las pantallas y en las diapositivas de esta consola."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={apply} isLoading={isSaving}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-6 pb-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProjectionCanvas
          frame={preview}
          className="rounded-md ring-1 ring-line md:sticky md:top-0"
        />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <TypographyFields draft={draft} onChange={set} />

            <section className="flex flex-col gap-2 border-t border-line pt-5">
              <h3 className="eyebrow text-ink-2">Tamaño en las diapositivas de la consola</h3>
              <p className="text-xs text-ink-2">
                Solo lo ves tú, en esta computadora. Texto simple, sin estilos.
              </p>
              <SizeControl
                label="Tamaño del texto de las diapositivas"
                range={SLIDE_TEXT_SIZE}
                step={1}
                value={slideSize}
                onChange={setSlideSize}
              />
              <span
                aria-hidden
                className="flex h-24 w-44 flex-col justify-center overflow-hidden rounded-md bg-black px-2.5 py-2 text-2xs whitespace-pre-line text-white"
                style={{ fontSize: slideSize }}
              >
                {SAMPLE}
              </span>
            </section>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
