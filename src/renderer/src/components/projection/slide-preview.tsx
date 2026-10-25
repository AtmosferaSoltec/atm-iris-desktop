import { cn } from "@renderer/lib/cn";

type SlidePreviewProps = {
  text: string;
  label?: string | null;
  footnote?: string;
  className?: string;
};

/**
 * One projected screen, 16:9, black with white serif text — the same look the TV and the
 * iPad/Windows consoles use. Sizes are relative to the card width (container query units),
 * so it reads the same in a thumbnail or a large preview (IRIS_SPEC §4.3).
 */
export function SlidePreview({ text, label, footnote, className }: SlidePreviewProps) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="@container relative aspect-video overflow-hidden rounded-md bg-black ring-1 ring-line">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.5cqw] p-[7cqw] text-center">
          <p className="font-serif text-[4.6cqw] leading-[1.25] font-medium whitespace-pre-line text-white [text-shadow:0_0_1.2cqw_rgb(0_0_0/0.45)]">
            {text}
          </p>
          {footnote && (
            <p className="text-[2.2cqw] font-semibold tracking-[0.3cqw] text-white/60 uppercase">
              {footnote}
            </p>
          )}
        </div>
      </div>
      {label && (
        <figcaption className="truncate text-[13px] font-medium text-ink-2">{label}</figcaption>
      )}
    </figure>
  );
}
