import { Bold, CaseUpper, Italic, Minus, Plus } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { toast } from "@renderer/components/ui/toaster";
import { PROJECTION_FONTS, PROJECTION_FONT_SIZE } from "@shared/domain/projection-fonts";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import {
  fontStack,
  type ProjectionFrame,
  type ProjectionTypography,
} from "@renderer/features/projection/model";
import { cn } from "@renderer/lib/cn";
import type { LiveConsole } from "../use-live-console";
import { saveTypography } from "./actions";

const SAMPLE = "Sublime gracia del Señor\nque a un pecador salvó";
const SIZE_STEP = 5;

/**
 * How the lyrics look on the screens: typeface, size, bold, italic and capitals. The
 * preview shows the background in use and the slide on screen; "Aplicar" changes the
 * screens at once and keeps it for the church.
 */
export function TypographyDialog({ ctrl, onClose }: { ctrl: LiveConsole; onClose: () => void }) {
  const [draft, setDraft] = useState<ProjectionTypography>(ctrl.typography);
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
    startSave(async () => {
      const result = await saveTypography(draft);
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
      description="Cómo se ve la letra en las pantallas. Se guarda para tu iglesia."
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
          <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-2">Fuente</h3>
            <div className="grid grid-cols-3 gap-2">
              {PROJECTION_FONTS.map((font) => (
                <button
                  key={font.key}
                  type="button"
                  aria-pressed={draft.fontFamily === font.key}
                  onClick={() => set({ fontFamily: font.key })}
                  className={cn(
                    "flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2.5 text-left ring-1 transition ring-inset",
                    draft.fontFamily === font.key
                      ? "bg-coral/12 ring-coral"
                      : "ring-line hover:bg-surface-raised",
                  )}
                >
                  <span className="truncate text-lg" style={{ fontFamily: fontStack(font.key) }}>
                    {font.label}
                  </span>
                  <span className="truncate text-xs text-ink-2">{font.note}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow text-ink-2">Tamaño</h3>
              <div className="flex items-center gap-3">
                <IconButton
                  label="Más chica"
                  disabled={draft.fontSizePt <= PROJECTION_FONT_SIZE.min}
                  onClick={() =>
                    set({
                      fontSizePt: Math.max(PROJECTION_FONT_SIZE.min, draft.fontSizePt - SIZE_STEP),
                    })
                  }
                >
                  <Minus />
                </IconButton>
                <input
                  type="range"
                  aria-label="Tamaño de la letra"
                  min={PROJECTION_FONT_SIZE.min}
                  max={PROJECTION_FONT_SIZE.max}
                  step={SIZE_STEP}
                  value={draft.fontSizePt}
                  onChange={(event) => set({ fontSizePt: Number(event.target.value) })}
                  className="flex-1 accent-coral"
                />
                <IconButton
                  label="Más grande"
                  disabled={draft.fontSizePt >= PROJECTION_FONT_SIZE.max}
                  onClick={() =>
                    set({
                      fontSizePt: Math.min(PROJECTION_FONT_SIZE.max, draft.fontSizePt + SIZE_STEP),
                    })
                  }
                >
                  <Plus />
                </IconButton>
                <span className="w-10 text-right font-mono text-sm text-ink-2 tabular-nums">
                  {draft.fontSizePt}
                </span>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="eyebrow text-ink-2">Estilo</h3>
              <div className="flex gap-2">
                <StyleToggle
                  label="Negrita"
                  icon={<Bold />}
                  isOn={draft.fontBold}
                  onToggle={() => set({ fontBold: !draft.fontBold })}
                />
                <StyleToggle
                  label="Cursiva"
                  icon={<Italic />}
                  isOn={draft.fontItalic}
                  onToggle={() => set({ fontItalic: !draft.fontItalic })}
                />
                <StyleToggle
                  label="Mayúsculas"
                  icon={<CaseUpper />}
                  isOn={draft.uppercase}
                  onToggle={() => set({ uppercase: !draft.uppercase })}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function StyleToggle({
  label,
  icon,
  isOn,
  onToggle,
}: {
  label: string;
  icon: ReactNode;
  isOn: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={cn(
        "flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium ring-1 transition ring-inset [&_svg]:size-4",
        isOn ? "bg-coral/12 text-ink ring-coral" : "text-ink-2 ring-line hover:bg-surface-raised",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
