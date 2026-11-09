import { Bold, CaseUpper, Italic, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@renderer/components/ui/button";
import { PROJECTION_FONTS, PROJECTION_FONT_SIZE } from "@shared/domain/projection-fonts";
import { fontStack, type ProjectionTypography } from "@renderer/features/projection/model";
import { cn } from "@renderer/lib/cn";

const SIZE_STEP = 5;

/** Typeface, size and style: shared by the songs' "Texto" and the Bible's own lettering. */
export function TypographyFields({
  draft,
  onChange,
  sizeTitle = "Tamaño en las pantallas",
}: {
  draft: ProjectionTypography;
  onChange: (change: Partial<ProjectionTypography>) => void;
  sizeTitle?: string;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="eyebrow text-ink-2">Fuente</h3>
        <div className="grid grid-cols-3 gap-2">
          {PROJECTION_FONTS.map((font) => (
            <button
              key={font.key}
              type="button"
              aria-pressed={draft.fontFamily === font.key}
              onClick={() => onChange({ fontFamily: font.key })}
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

      <section className="flex flex-col gap-2">
        <h3 className="eyebrow text-ink-2">{sizeTitle}</h3>
        <SizeControl
          label="Tamaño de la letra"
          range={PROJECTION_FONT_SIZE}
          step={SIZE_STEP}
          value={draft.fontSizePt}
          onChange={(fontSizePt) => onChange({ fontSizePt })}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="eyebrow text-ink-2">Estilo</h3>
        <div className="flex gap-2">
          <StyleToggle
            label="Negrita"
            icon={<Bold />}
            isOn={draft.fontBold}
            onToggle={() => onChange({ fontBold: !draft.fontBold })}
          />
          <StyleToggle
            label="Cursiva"
            icon={<Italic />}
            isOn={draft.fontItalic}
            onToggle={() => onChange({ fontItalic: !draft.fontItalic })}
          />
          <StyleToggle
            label="Mayúsculas"
            icon={<CaseUpper />}
            isOn={draft.uppercase}
            onToggle={() => onChange({ uppercase: !draft.uppercase })}
          />
        </div>
      </section>
    </>
  );
}

export function SizeControl({
  label,
  range,
  step,
  value,
  onChange,
}: {
  label: string;
  range: { min: number; max: number };
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconButton
        label={`${label}: más chica`}
        disabled={value <= range.min}
        onClick={() => onChange(Math.max(range.min, value - step))}
      >
        <Minus />
      </IconButton>
      <input
        type="range"
        aria-label={label}
        min={range.min}
        max={range.max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1 accent-coral"
      />
      <IconButton
        label={`${label}: más grande`}
        disabled={value >= range.max}
        onClick={() => onChange(Math.min(range.max, value + step))}
      >
        <Plus />
      </IconButton>
      <span className="w-10 text-right font-mono text-sm text-ink-2 tabular-nums">{value}</span>
    </div>
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
